import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from './entities/promotion.entity.js';
import { Order } from '../order/entities/order.entity.js';
import {TrangThaiDonHang} from '../order/enum/order.enum.js'
import { CreatePromotionDto } from './dto/CreatePromotion.dto.js'

@Injectable()
export class PromotionService {
  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo:Repository<Promotion>,

    @InjectRepository(Order)
    private readonly orderRepo:Repository<Order>){}
    async taoMaMoi(maMoi:CreatePromotionDto):Promise<Promotion>{
      const kiemTra = await this.promotionRepo.findOne({
        where:{maPromotion:maMoi.maPromotion.toUpperCase()}
      })
      if(kiemTra){
        throw new BadRequestException('Mã khuyến mãi đã tồn tại');
      }
      const newMaMoi = this.promotionRepo.create({
        ...maMoi,
        maPromotion:maMoi.maPromotion.toUpperCase(),
        hanPromotion:new Date (maMoi.hanPromotion)
      })
      return this.promotionRepo.save(newMaMoi);
    }
    async findAll():Promise<Promotion[]>{
      return this.promotionRepo.find()
    }
    async kiemTraHopLe(maPromotion: string): Promise<Promotion> {
    const promo = await this.promotionRepo.findOne({
      where: { maPromotion: maPromotion.toUpperCase() },
    });

    if (!promo) {
      throw new NotFoundException('Mã khuyến mãi không tồn tại');
    }
    if (!promo.trangThaiHoatDong) {
      throw new BadRequestException('Mã khuyến mãi đã ngừng hoạt động');
    }
    if (new Date(promo.hanPromotion) < new Date()) {
      throw new BadRequestException('Mã khuyến mãi đã hết hạn');
    }

    return promo;
  }
    async apDungMa(idOrder:string, maGiamGia:string):Promise<Order>{
      const timOrder = await this.orderRepo.findOne({
        where :{idOrder:idOrder}
      })
      if(!timOrder){
        throw new NotFoundException("Không tìm thấy đơn")
      }
      if(timOrder.trangThai===TrangThaiDonHang.DA_NHAN){
        throw new BadRequestException('Đơn hàng đã thanh toán, không thể áp dụng mã');
      }
      const newMa = await this.kiemTraHopLe(maGiamGia);
      let tongTien = Number(timOrder.tongTien);

      if(timOrder.promotion){
        if (timOrder.promotion.idPromotion === newMa.idPromotion) {
          throw new BadRequestException('Mã này đang được áp dụng cho đơn hàng');
        }
        tongTien +=  Number(timOrder.promotion.giamGia)
      }

      const discount = Number(newMa.giamGia);
      timOrder.tongTien = Math.max(0, tongTien - discount); 
      timOrder.promotion = newMa; 

      return this.orderRepo.save(timOrder);

    }
    async goMaGiamGia(orderId:string){
      const order = await this.orderRepo.findOne({
        where:{idOrder:orderId}
      })
      if(!order){
        throw new NotFoundException('Mã khuyến mãi không tồn tại');
      }
      if(order.trangThai === TrangThaiDonHang.DA_NHAN){
        throw new BadRequestException('Đơn hàng đã thanh toán, không thể áp dụng mã');
      }
      if (!order.promotion) {
        throw new BadRequestException('Đơn hàng chưa áp dụng mã nào');
      }
      order.tongTien = Number(order.tongTien) + Number(order.promotion.giamGia);
      order.promotion = null!;

      return this.orderRepo.save(order);

    }
    async toggleStatus(idPromotion: string){
      const promo = await this.promotionRepo.findOne({ where: { idPromotion:idPromotion } });
      if (!promo) throw new NotFoundException('Không tìm thấy mã khuyến mãi');

      promo.trangThaiHoatDong = !promo.trangThaiHoatDong;
      return this.promotionRepo.save(promo);
    }
}
