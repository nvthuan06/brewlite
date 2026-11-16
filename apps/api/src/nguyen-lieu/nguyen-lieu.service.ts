import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {NguyenLieu} from '../nguyen-lieu/entities/nguyen-lieu.entity.js'
import { EntityManager, Repository } from 'typeorm';
import { ChiTietNguyenLieu } from './entities/chitietnguyenlieu.entity.js';
import { Product } from '../products/entities/product.entity.js';

@Injectable()
export class NguyenLieuService{
  constructor(
    @InjectRepository(NguyenLieu)
    private readonly nguyenlieuRepo:Repository<NguyenLieu>,
    @InjectRepository(ChiTietNguyenLieu)
    private readonly congthucRepo:Repository<ChiTietNguyenLieu>,
    @InjectRepository(Product)
    private readonly sp:Repository<Product>
  ){}
  async truTonKho(sanpham: number, soLuongMua: number, manager?: EntityManager) {
    const spRepo = manager ? manager.getRepository(Product) : this.sp;
    const nlRepo = manager ? manager.getRepository(NguyenLieu) : this.nguyenlieuRepo;

    const sp = await spRepo.findOne({
      where: { idProduct: sanpham },
        relations: {
        chitietnguyenlieu: { nguyenlieu: true },
      },
    });

    if (sp && sp.chitietnguyenlieu) {
      for (const ct of sp.chitietnguyenlieu) {
        const nguyenLieu = ct.nguyenlieu;
        const luongTieuHao = ct.dinhLuong * soLuongMua; 
        nguyenLieu.tonKho = Math.max(0, nguyenLieu.tonKho - luongTieuHao);
      
      await nlRepo.save(nguyenLieu);
    }
  }
}
  async capNhatSoLuong(sanpham:number){
    const sp = await this.sp.findOne({
      where:{idProduct:sanpham},
      relations: {
        chitietnguyenlieu: {
        nguyenlieu: true
      },
    }})
    if (!sp || !sp.chitietnguyenlieu || sp.chitietnguyenlieu.length === 0) {
      return 0; 
    }
    let soluongthapnhat =99999;
    if(sp){
      for(const ct of sp.chitietnguyenlieu){
        const tonKhoCon = ct.nguyenlieu.tonKho;
        const sl = Math.floor(tonKhoCon / ct.dinhLuong);
        if(sl<soluongthapnhat){
          soluongthapnhat = sl;
        }
      }
    }
    return soluongthapnhat;
  }
  async findAll(){
    return await this.nguyenlieuRepo.find();
  }
  async findOne(id:number){
    const nguyenlieu = await this.nguyenlieuRepo.findOne({
      where:{idNguyenLieu:id}
    })
    if(!nguyenlieu){
      throw new NotFoundException(`Nguyên liệu với id ${id} không tồn tại`);
    }
    return nguyenlieu;
  }

}
