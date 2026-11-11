import { Injectable } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { Payment } from './entities/payment.entity.js';
import { PhuongThucThanhToan, TrangThaiThanhToan } from './enum/payment.enum.js';
import { Order } from '../order/entities/order.entity.js';
import {TrangThaiDonHang} from '../order/enum/order.enum.js'


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
        if(payload.transferType==='out'|| payload.amontIn<=0){
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
                .where(':content ILIKE CONCAT(\'%\', payment.maChuyenKhoan, \'%\')', {content: payload.transactionContent})
                .andWhere('payment.trangThai = :status', { status: TrangThaiThanhToan.PENDING })
                .getOne();

            if(!payment){
                await queryRunner.release();
                return{
                    success:true,
                    massage:'Không thấy đơn hàng'
                }
            }
            if(payload.amountIn>=payment.soTien){
                payment.trangThai=TrangThaiThanhToan.SUCCESS_PAYMENT;
                payment.ngayThanhToan = new Date(payload.transactionDate);
                payment.IdempotencyKey=payload.id;
                await queryRunner.manager.save(payment);
                if(payment.order){
                    payment.order.trangThai = TrangThaiDonHang.DA_NHAN;
                    await queryRunner.manager.save(Order,payment.order);
                }
            }else {
                payment.trangThai = TrangThaiThanhToan.FAIL_PAYMENT;
                payment.IdempotencyKey = payload.id;
                await queryRunner.manager.save(Payment, payment);
            }
            await queryRunner.commitTransaction();
            return{sucess:true};
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