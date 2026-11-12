import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderItemDto } from './dto/orderitem.dto.js'
import { Order } from './entities/order.entity.js'
import {Product} from '../products/entities/product.entity.js'
import {OrderItem} from './entities/orderItem.entity.js'
import {TrangThaiDonHang} from './enum/order.enum.js'
import {PaymentService} from '../payment/payment.service.js'
import { PhuongThucThanhToan} from '../payment/enum/payment.enum.js';
import { PromotionService } from '../promotion/promotion.service.js';
@Injectable()
export class OrderService {

  constructor(private readonly ds:DataSource,private readonly paymentService:PaymentService, private readonly promotionService: PromotionService ){}

  async CheckOut(userId:string, createOrderDto:CreateOrderDto){
    const {items, maPromotion} = createOrderDto;
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let tongTien =0;
      const luuItems = [];

      for(const item of items){
        const product = await queryRunner.manager.findOne(Product,{
          where :{idProduct : Number(item.productId)}
        })
        if(!product){
          throw new BadRequestException("Không thấy sản phẩm này")
        }
        if(product.soLuong<item.soLuong){
          throw new BadRequestException("Không đủ số lượng")
        }
        
        const thanhTien = Number(product.giaProduct) * item.soLuong;
        tongTien = tongTien + thanhTien;

        const orderItem = await queryRunner.manager.create(OrderItem, {
          product : product,
          soLuong : item.soLuong,
          thanhTien : thanhTien,
          size : item.size,
          topping : item.topping
        });
        luuItems.push(orderItem);
      }
      let ma = null;
      if(maPromotion){
        ma = await this.promotionService.kiemTraHopLe(maPromotion)
        const discount = Number(ma.giamGia);
        tongTien = Math.max(0, tongTien - discount);
      }

      const newOrder =  queryRunner.manager.create(Order,{
        tongTien:tongTien,
        trangThai:TrangThaiDonHang.DANG_THANH_TOAN,
        promotion:ma ?? undefined,
        orderitem:luuItems
      });
      await queryRunner.manager.save(Order, newOrder);
      const paymentInfo = await this.paymentService.CreatePayment(
        queryRunner,
        newOrder,
        tongTien,
        PhuongThucThanhToan.VI,
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
      throw new InternalServerErrorException('Lỗi hệ thống khi tạo đơn hàng: ' + error);
    } finally {
      await queryRunner.release();
    }
    
  }
    async findAll() {
      return await this.ds.manager.find(Order, {
      relations: { orderitem: true, promotion: true},
      order: {
        ngayDatHang: 'DESC'
      }
    });
  }
}
