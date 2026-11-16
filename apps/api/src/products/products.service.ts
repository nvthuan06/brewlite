import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Product,
  ProductSizeOption,
  ProductToppingOption,
} from './entities/product.entity.js';
import { SIZE, TOPPING } from '../order/enum/orderitem.enum.js';
import {CreateProductDto} from '../products/dto/create-product.dto.js'
import { NguyenLieu } from '../nguyen-lieu/entities/nguyen-lieu.entity.js';
import { ChiTietNguyenLieu } from '../nguyen-lieu/entities/chitietnguyenlieu.entity.js';
import { NguyenLieuService } from '../nguyen-lieu/nguyen-lieu.service.js';

export const DEFAULT_SIZES: ProductSizeOption[] = [
  { code: SIZE.S, label: 'Size S', extraPrice: 0 },
  { code: SIZE.M, label: 'Size M', extraPrice: 5000 },
  { code: SIZE.XL, label: 'Size XL', extraPrice: 10000 },
];

export const DEFAULT_TOPPINGS: ProductToppingOption[] = [
  { code: TOPPING.TRAN_CHAU, label: 'Trân châu', extraPrice: 5000 },
  { code: TOPPING.KEM, label: 'Kem', extraPrice: 7000 },
  { code: TOPPING.PHO_MAI, label: 'Phô mai', extraPrice: 8000 },
];

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(NguyenLieu)
    private readonly nguyenlieuRepo:Repository<NguyenLieu>,
    @InjectRepository(ChiTietNguyenLieu)
    private readonly congthucRepo:Repository<ChiTietNguyenLieu>,
    private readonly nguyenLieuService: NguyenLieuService

  ) {}

  async onModuleInit() {
    const dem = await this.productRepo.count();
    const demNguyenLieu = await this.nguyenlieuRepo.count();
    const demCongThuc = await this.congthucRepo.count();
    if (dem === 0) {
      const taoSP = [
        {
          tenProduct: 'Cà phê sữa',
          giaProduct: 30000,
          soLuong: 0,
          trangThaiBan: true,
          urlAnh:
            '/images/ca_phe_sua.png',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Cà phê đen',
          giaProduct: 25000,
          soLuong: 0,
          trangThaiBan: true,
          urlAnh:
            '/images/Ca_phe_den.png',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Cappuccino',
          giaProduct: 35000,
          soLuong: 0,
          trangThaiBan: true,
          urlAnh:
            '/images/cappuchino.png',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Latte',
          giaProduct: 40000,
          soLuong: 0,
          trangThaiBan: true,
          urlAnh:
            '/images/latte.png',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Sinh tố bơ',
          giaProduct: 45000,
          soLuong: 0,
          trangThaiBan: true,
          urlAnh:
            '/images/sinh_to_bo.png',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
      ];
      await this.productRepo.save(taoSP);
      this.logger.log('Đã tạo dữ liệu mẫu cho bảng products');
    } else {
      const existingProducts = await this.productRepo.find();
      for (const item of existingProducts) {
        if (!item.sizes || !item.toppings) {
          item.sizes = item.sizes ?? DEFAULT_SIZES;
          item.toppings = item.toppings ?? DEFAULT_TOPPINGS;
          await this.productRepo.save(item);
        }
      }
    }
    if (demNguyenLieu===0){
      const nguyenlieu = [{
        tenNguyenLieu:'Cà phê',
        tonKho:50000,
        donVi:'g'
      },{
        tenNguyenLieu:'Sữa',
        tonKho:20000,
        donVi:'ml'
      },{
        tenNguyenLieu:'Bơ',
        tonKho:100,
        donVi:'trái'
      },{
        tenNguyenLieu:'Kem',
        tonKho:10000,
        donVi:'ml'
      },{
        tenNguyenLieu:'Đường',
        tonKho:50000,
        donVi:'g'
      }]
      await this.nguyenlieuRepo.save(nguyenlieu);
    }
    if(demCongThuc===0){
      const danhSachCongThuc = [
  // --- 1. Cà phê sữa ---
  // 20g Cà phê + 40ml Sữa
  { product: { idProduct: 1 }, nguyenlieu: { idNguyenLieu: 1 }, dinhLuong: 20 },
  { product: { idProduct: 1 }, nguyenlieu: { idNguyenLieu: 2 }, dinhLuong: 40 },

  // --- 2. Cà phê đen ---
  // 25g Cà phê + 15g Đường
  { product: { idProduct: 2 }, nguyenlieu: { idNguyenLieu: 1 }, dinhLuong: 25 },
  { product: { idProduct: 2 }, nguyenlieu: { idNguyenLieu: 5 }, dinhLuong: 15 },

  // --- 3. Cappuccino ---
  // 20g Cà phê + 40ml Sữa + 20ml Kem (tạo bọt) + 5g Đường
  { product: { idProduct: 3 }, nguyenlieu: { idNguyenLieu: 1 }, dinhLuong: 20 },
  { product: { idProduct: 3 }, nguyenlieu: { idNguyenLieu: 2 }, dinhLuong: 40 },
  { product: { idProduct: 3 }, nguyenlieu: { idNguyenLieu: 4 }, dinhLuong: 20 },
  { product: { idProduct: 3 }, nguyenlieu: { idNguyenLieu: 5 }, dinhLuong: 5 },

  // --- 4. Latte ---
  // 20g Cà phê + 80ml Sữa (nhiều sữa hơn Cappuccino) + 10ml Kem
  { product: { idProduct: 4 }, nguyenlieu: { idNguyenLieu: 1 }, dinhLuong: 20 },
  { product: { idProduct: 4 }, nguyenlieu: { idNguyenLieu: 2 }, dinhLuong: 80 },
  { product: { idProduct: 4 }, nguyenlieu: { idNguyenLieu: 4 }, dinhLuong: 10 },

  // --- 5. Sinh tố bơ ---
  // 1 trái Bơ + 50ml Sữa + 20ml Kem + 20g Đường
  { product: { idProduct: 5 }, nguyenlieu: { idNguyenLieu: 3 }, dinhLuong: 1 },
  { product: { idProduct: 5 }, nguyenlieu: { idNguyenLieu: 2 }, dinhLuong: 50 },
  { product: { idProduct: 5 }, nguyenlieu: { idNguyenLieu: 4 }, dinhLuong: 20 },
  { product: { idProduct: 5 }, nguyenlieu: { idNguyenLieu: 5 }, dinhLuong: 20 },
];
    
    await this.congthucRepo.save(this.congthucRepo.create(danhSachCongThuc));
  }

  const sp = await this.productRepo.find();
  for(const s of sp){
    const soluong =await this.nguyenLieuService.capNhatSoLuong(s.idProduct);
    s.soLuong=soluong;
    await this.productRepo.save(s);
  }
}

  async findAll() {
    return await this.productRepo.find();
  }

  async findOne(id: number) {
    const oneProduct = await this.productRepo.findOne({
      where: { idProduct: id },
    });

    if (!oneProduct) {
      throw new NotFoundException(`Không tìm thấy sản phẩm có id ${id}`);
    }

    return {
      ...oneProduct,
      giaProduct: Number(oneProduct.giaProduct),
      sizes: oneProduct.sizes ?? DEFAULT_SIZES,
      toppings: oneProduct.toppings ?? DEFAULT_TOPPINGS,
    };
  }
}
function capNhatSoLuong(idProduct: number) {
  throw new Error('Function not implemented.');
}

