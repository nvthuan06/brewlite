import { Module } from '@nestjs/common';
import { NguyenLieuService } from './nguyen-lieu.service.js';
import { NguyenLieuController } from './nguyen-lieu.controller.js';
import { Product } from '../products/entities/product.entity.js';
import { ChiTietNguyenLieu } from './entities/chitietnguyenlieu.entity.js';
import { NguyenLieu } from './entities/nguyen-lieu.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports:[TypeOrmModule.forFeature([NguyenLieu, ChiTietNguyenLieu, Product])],
  controllers: [NguyenLieuController],
  providers: [NguyenLieuService],
  exports: [NguyenLieuService],
})
export class NguyenLieuModule {}
