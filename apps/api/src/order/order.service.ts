import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, Not } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderItemDto } from './dto/orderitem.dto.js'
import { Order } from './entities/order.entity.js'
import {Product} from '../products/entities/product.entity.js'
import {OrderItem} from './entities/orderItem.entity.js'
import {TrangThaiDonHang} from './enum/order.enum.js'
import {PaymentService} from '../payment/payment.service.js'
import { PhuongThucThanhToan} from '../payment/enum/payment.enum.js';
@Injectable()
export class OrderService {
  constructor(private readonly ds: DataSource) {}

  constructor(private readonly ds:DataSource,private readonly paymentService:PaymentService ){}

  async CheckOut(userId:string, createOrderDto:CreateOrderDto){
    const {items} = createOrderDto;
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const kiemtra = await queryRunner.manager.findOne(Order, {
        where: { idempotencyKey: idempotencyKey },
      });
      if (kiemtra) {
        return kiemtra;
      }

      let tongTien = 0;
      const luuItems = [];

      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { idProduct: Number(item.productId) },
        });
        if (!product) {
          throw new BadRequestException('Không thấy sản phẩm này');
        }
        if (!product.trangThaiBan) {
          throw new BadRequestException(
            `Sản phẩm "${product.tenProduct}" không còn bán`,
          );
        }
        if (product.soLuong < item.soLuong) {
          throw new BadRequestException('Không đủ số lượng');
        }
        const thanhTien = Number(product.giaProduct) * item.soLuong;
        tongTien = tongTien + thanhTien;

        const orderItem = await queryRunner.manager.create(OrderItem, {
          product: product,
          soLuong: item.soLuong,
          thanhTien: thanhTien,
          size: item.size,
          topping: item.topping,
        });
        luuItems.push(orderItem);
      }
      const newOrder = await queryRunner.manager.create(Order,{
        tongTien:tongTien,
        trangThai:TrangThaiDonHang.DANG_THANH_TOAN,
        orderItem:luuItems
      });
      await queryRunner.manager.save(Order, newOrder);
      const paymentInfo = await this.paymentService.CreatePayment(
        queryRunner, 
        newOrder, 
        tongTien, 
        PhuongThucThanhToan.VI
      );
      

      await queryRunner.commitTransaction();
      return {
        order:newOrder,
        detail: paymentInfo,
      };
    }catch(error){
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi tạo đơn hàng: ' + error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async cancelOrder(userid: string, idOrder: string) {
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { idOrder: idOrder },
      });
      if (!order) {
        throw new NotFoundException("Không tìm thấy đơn hàng")
      }
      if (![TrangThaiDonHang.HUY, TrangThaiDonHang.THAT_BAI].includes(order.trangThai)) {
        throw new BadRequestException('Không thể hủy đơn hàng này.');
      }
      order.trangThai = TrangThaiDonHang.HUY;
      for(const item of order.orderitem) {
        if (item.product) {
          item.product.soLuong += item.soLuong;
          await queryRunner.manager.save(Product, item.product);
        }
      }
      const donHangBiHuy = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return donHangBiHuy;

    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi xóa đơn hàng: ' + error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateOrderStatus (idOrder: string, idUser: string, trangThaiMoi: TrangThaiDonHang) {
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {where: {idOrder : idOrder}});
      if (!order) {
        throw new NotFoundException("Không tìm thấy đơn hàng");
      }

      if (order.trangThai === TrangThaiDonHang.THAT_BAI || order.trangThai === TrangThaiDonHang.HUY) {
        throw new BadRequestException(`Đơn hàng đang ở trạng thái "${order.trangThai}", không thể đổi`);
      }
      const trangThaiHopLe: Record<TrangThaiDonHang, TrangThaiDonHang[]> = {
        [TrangThaiDonHang.DA_NHAN]: [
          TrangThaiDonHang.DANG_CHUAN_BI,
          TrangThaiDonHang.HUY,
          TrangThaiDonHang.THAT_BAI,
        ],
        [TrangThaiDonHang.DANG_CHUAN_BI]: [
          TrangThaiDonHang.HOAN_TAT,
          TrangThaiDonHang.HUY,
        ],
        [TrangThaiDonHang.THAT_BAI]: [TrangThaiDonHang.HUY],
        [TrangThaiDonHang.HOAN_TAT]: [],
        [TrangThaiDonHang.HUY]: [],
      };

      if (!trangThaiHopLe[order.trangThai].includes(trangThaiMoi)) {
        throw new BadRequestException("Không thể chuyển trạng thái trùng");
      }

      if (trangThaiMoi === TrangThaiDonHang.HUY || trangThaiMoi === TrangThaiDonHang.THAT_BAI) {
        for (const item of order.orderitem) {
          if (item.product) {
            item.product.soLuong += item.soLuong;
            await queryRunner.manager.save(Product, item.product);
          }
        }
      }
      order.trangThai = trangThaiMoi;
      const donHangCapNhat = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return donHangCapNhat;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException("Lỗi cập nhật trạng thái đơn hàng: " + error);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.ds.getRepository(Order).find({
      relations: { orderitem: { product: true } },
      order: { ngayDatHang: 'DESC' },
    });
  }

  async findOne(idOrder: string) {
    const order = await this.ds.getRepository(Order).findOne({
      where: { idOrder },
      relations: { orderitem: { product: true } },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${idOrder}`);
    }
    return order;
  }
}
