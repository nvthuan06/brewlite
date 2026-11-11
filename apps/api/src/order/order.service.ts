import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { OrderItemDto } from './dto/orderitem.dto.js'
import { Order } from './entities/order.entity.js'
import {Product} from '../products/entities/product.entity.js'
import {OrderItem} from './entities/orderItem.entity.js'
import {TrangThaiDonHang} from './enum/order.enum.js'
@Injectable()
export class OrderService {

  constructor(private readonly ds:DataSource){}

  async CheckOut(userId:string, createOrderDto:CreateOrderDto){
    const {idempotencyKey, items} = createOrderDto;
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const kiemtra = await queryRunner.manager.findOne(Order,{
        where : {idempotencyKey:idempotencyKey}
      })
      if(kiemtra){
        await queryRunner.release();
        return kiemtra;
      }

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
      const newOrder = await queryRunner.manager.create(Order,{
        idempotencyKey:idempotencyKey,
        tongTien:tongTien,
        trangThai:TrangThaiDonHang.DA_NHAN,
        orderItem:luuItems
      });
      await queryRunner.manager.save(Order, newOrder);
      await queryRunner.commitTransaction();
      return newOrder;
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
}
