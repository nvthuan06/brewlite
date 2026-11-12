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
  ) {}

  async onModuleInit() {
    const dem = await this.productRepo.count();
    if (dem === 0) {
      const taoSP = [
        {
          tenProduct: 'Cà phê sữa',
          giaProduct: 30000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh:
            'https://cdn.tgdd.vn/Products/Images/42/268882/cafe-sua-da-600x600.jpg',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Cà phê đen',
          giaProduct: 25000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh:
            'https://cdn.tgdd.vn/Products/Images/42/268882/cafe-den-600x600.jpg',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Cappuccino',
          giaProduct: 35000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh:
            'https://cdn.tgdd.vn/Products/Images/42/268882/cappuccino-600x600.jpg',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Latte',
          giaProduct: 40000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh:
            'https://cdn.tgdd.vn/Products/Images/42/268882/latte-600x600.jpg',
          sizes: DEFAULT_SIZES,
          toppings: DEFAULT_TOPPINGS,
        },
        {
          tenProduct: 'Sinh tố bơ',
          giaProduct: 45000,
          soLuong: 100,
          trangThaiBan: true,
          urlAnh:
            'https://cdn.tgdd.vn/Products/Images/42/268882/sinh-to-bo-600x600.jpg',
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