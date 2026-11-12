import { Module } from '@nestjs/common';
import { PromotionService } from './promotion.service.js';
import { PromotionController } from './promotion.controller.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity.js';
import { Order } from '../order/entities/order.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Order])],
  controllers: [PromotionController],
  providers: [PromotionService],
  exports: [PromotionService],
})
export class PromotionModule {}
