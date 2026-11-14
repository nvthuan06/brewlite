import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Payment } from './entities/payment.entity.js';
import { PhuongThucThanhToan, TrangThaiThanhToan } from './enum/payment.enum.js';
import { Order } from '../order/entities/order.entity.js';
import {TrangThaiDonHang} from '../order/enum/order.enum.js'
import {Product } from '../products/entities/product.entity.js'


@Injectable()
export class PaymentService {
    constructor(private readonly ds: DataSource) {}
    async CreatePayment (
        queryRunner: QueryRunner, 
        order: Order, 
        soTien: number, 
        phuongThuc: PhuongThucThanhToan
    ){
        if(phuongThuc !== PhuongThucThanhToan.VI){
            return null;
        }
        const maChuyenKhoan = `DH${Math.floor(Math.random() * 1000000)}`;
        const newPayment = queryRunner.manager.create(Payment, {
            soTien: soTien,
            phuongThuc: phuongThuc,
            trangThai: TrangThaiThanhToan.PENDING,
            maChuyenKhoan: maChuyenKhoan,
            order: order
        });
        await queryRunner.manager.save(newPayment);

        return {
            payment:newPayment,
            qrCodeUrl: `https://qr.sepay.vn/img?acc=0000000002&bank=MBBank&amount=${soTien}&des=${maChuyenKhoan}`
        }
    }
    async handWeHook(payload:any){
        if(payload.transferType==='out'|| payload.transferAmount<=0){
            return{
                success:true,
                massage:'Bỏ qua giao dịch'
            }
        }
        const isProcessed = await this.ds.getRepository(Payment).findOne({
            where: { IdempotencyKey: payload.id }
        });
        if (isProcessed) {
            return { success: true, message: 'Idempotency: Đã xử lý' };
        }

        const queryRunner = this.ds.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();



        try{
            const payment = await queryRunner.manager.createQueryBuilder(Payment, 'payment')
                .leftJoinAndSelect('payment.order', 'order')
                .leftJoinAndSelect('order.orderitem', 'orderitem')
                .leftJoinAndSelect('orderitem.product', 'product')
                .where(':content ILIKE CONCAT(\'%\', payment.maChuyenKhoan, \'%\')', { content: payload.content })
                .andWhere('payment.trangThai = :status', { status: TrangThaiThanhToan.PENDING })
                .getOne();

            console.log(payment);

            if (!payment) {
                console.log("❌ LỖI LOGIC: Không tìm thấy mã PENDING nào khớp với content từ SePay:", payload.content);
                await queryRunner.rollbackTransaction();
                return { success: true, message: 'Không thấy đơn hàng' };
            }
                console.log("✅ Đã tìm thấy thanh toán cần duyệt:", payment.maChuyenKhoan);
            const THOI_GIAN_CHO_PHEP = 15 * 60 * 1000; 
            const thoiGianHienTai = new Date().getTime();
            const thoiGianTaoDon = new Date(payment.order.ngayDatHang).getTime(); 
            if (thoiGianHienTai - thoiGianTaoDon > THOI_GIAN_CHO_PHEP) {
                payment.trangThai = TrangThaiThanhToan.FAIL_PAYMENT;
                payment.IdempotencyKey = payload.id;
                payment.ngayThanhToan = new Date(payload.transactionDate);
                await queryRunner.manager.save(Payment, payment);
                
                payment.order.trangThai = TrangThaiDonHang.HUY;
                await queryRunner.manager.save(Order, payment.order);
                
                await queryRunner.commitTransaction();
                return { success: true, message: 'Thanh toán trễ, đơn hàng đã bị hủy.' };
            }
            if(payload.transferAmount>=payment.soTien){
                payment.trangThai=TrangThaiThanhToan.SUCCESS_PAYMENT;
                payment.ngayThanhToan = new Date(payload.transactionDate);
                payment.IdempotencyKey=payload.id;
                await queryRunner.manager.save(payment);
                if(payment.order){
                    payment.order.trangThai = TrangThaiDonHang.DA_NHAN;
                    await queryRunner.manager.save(Order,payment.order);
                }
                if(payment.order.orderitem.length>0){
                    for (const item of payment.order.orderitem){
                        if((item as any).product){
                            (item as any).product.soLuong = (item as any).product.soLuong - (item as any).soLuong;
                                (item as any).product.soLuong = Math.max(0, (item as any).product.soLuong); 
                                await queryRunner.manager.save(Product, (item as any).product);
                        }
                    }
                }

            }else {
                payment.trangThai = TrangThaiThanhToan.FAIL_PAYMENT;
                payment.IdempotencyKey = payload.id;
                await queryRunner.manager.save(Payment, payment);
            }
            await queryRunner.commitTransaction();
            return{success:true};
        }catch(error){
            await queryRunner.rollbackTransaction();
            if ((error as any).code === '23505' || (error as any).code === 'ER_DUP_ENTRY') {
                return { success: true, message: 'Race condition handled' };
            }
            throw error;
        }finally {
            if (!queryRunner.isReleased) {
             await queryRunner.release();
            }
        }
    }
}