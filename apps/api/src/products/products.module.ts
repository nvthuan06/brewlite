import { Module } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { ProductsController } from './products.controller.js';
import { Product } from './entities/product.entity.js';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NguyenLieu } from '../nguyen-lieu/entities/nguyen-lieu.entity.js';
import { ChiTietNguyenLieu } from '../nguyen-lieu/entities/chitietnguyenlieu.entity.js';
import { NguyenLieuModule } from '../nguyen-lieu/nguyen-lieu.module.js';

@Module({
  imports: [NguyenLieuModule,TypeOrmModule.forFeature([Product,NguyenLieu,ChiTietNguyenLieu])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
