import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/orderItem.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { PaymentModule } from '../payment/payment.module.js';
import { OrderService } from './order.service.js';
import { OrderController } from './order.controller.js';
import { PromotionModule } from '../promotion/promotion.module.js';
@Module({
  
  imports:[PromotionModule,PaymentModule,TypeOrmModule.forFeature([Order, OrderItem, Product])],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
