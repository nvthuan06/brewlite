import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';
import { Payment } from './entities/payment.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NguyenLieuModule } from '../nguyen-lieu/nguyen-lieu.module.js';

@Module({
  imports: [NguyenLieuModule,TypeOrmModule.forFeature([Payment])],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
