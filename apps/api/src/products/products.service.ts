import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto.js';
// import { UpdateProductDto } from './dto/update-product.dto.js';
import { Product } from './entities/product.entity.js';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
  ){}
  async onModuleInit(){
    const dem = await this.productRepo.count();
    if(dem === 0){
      const taoSP = [
        {
          tenProduct: 'Cà phê sữa',
          giaProduct: 30000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh: 'https://cdn.tgdd.vn/Products/Images/42/268882/cafe-sua-da-600x600.jpg'
        },
        {
          tenProduct: 'Cà phê đen',
          giaProduct: 25000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh: 'https://cdn.tgdd.vn/Products/Images/42/268882/cafe-den-600x600.jpg'
        },
        {
          tenProduct: 'Cappuccino',
          giaProduct: 35000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh: 'https://cdn.tgdd.vn/Products/Images/42/268882/cappuccino-600x600.jpg'
        },
        {
          tenProduct: 'Latte',
          giaProduct: 40000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh: 'https://cdn.tgdd.vn/Products/Images/42/268882/latte-600x600.jpg'
        },
        {
          tenProduct: 'Sinh tố bơ',
          giaProduct: 45000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh: 'https://cdn.tgdd.vn/Products/Images/42/268882/sinh-to-bo-600x600.jpg'
        }
        
      ]
      await this.productRepo.save(taoSP);
      this.logger.log('Đã tạo dữ liệu mẫu cho bảng products');
    }
  }
  // create(createProductDto: CreateProductDto) {
  //   return 'This action adds a new product';
  // }

  //Lấy tất cả products ra
  async findAll() {
    return await this.productRepo.find();
  }


  async findOne(id: number) {
    const oneProduct = await this.productRepo.findOne({
      where: { idProduct: id }
    });
    if(!oneProduct){
      throw new Error(`Không tìm thấy sản phẩm có id ${id}`);
    }
    return await oneProduct;
  }

  // update(id: number, updateProductDto: UpdateProductDto) {
  //   return `This action updates a #${id} product`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} product`;
  // }
}
