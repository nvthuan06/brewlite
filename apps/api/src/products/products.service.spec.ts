import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import {
  ProductsService,
  DEFAULT_SIZES,
  DEFAULT_TOPPINGS,
} from './products.service.js';
import { Product } from './entities/product.entity.js';
import { SIZE, TOPPING } from '../order/enum/orderitem.enum.js';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProductRepository = {
    count: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepository,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('nên trả về danh sách tất cả sản phẩm', async () => {
      const mockList = [
        { idProduct: 1, tenProduct: 'Cà phê sữa', giaProduct: 30000 },
        { idProduct: 2, tenProduct: 'Cà phê đen', giaProduct: 25000 },
      ];
      mockProductRepository.find.mockResolvedValue(mockList);

      const result = await service.findAll();

      expect(mockProductRepository.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockList);
    });
  });

  describe('findOne', () => {
    it('nên trả về chi tiết sản phẩm kèm sizes và toppings khi tìm thấy', async () => {
      const mockProduct = {
        idProduct: 1,
        tenProduct: 'Cà phê sữa',
        giaProduct: '30000' as unknown as number,
        soLuong: 100,
        trangThaiBan: true,
        urlAnh: 'https://example.com/cafe-sua.jpg',
        sizes: [{ code: SIZE.S, label: 'Size S', extraPrice: 0 }],
        toppings: [
          { code: TOPPING.TRAN_CHAU, label: 'Trân châu', extraPrice: 5000 },
        ],
      };
      mockProductRepository.findOne.mockResolvedValue(mockProduct);

      const result = await service.findOne(1);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { idProduct: 1 },
      });
      expect(result.giaProduct).toBe(30000);
      expect(result.sizes).toEqual(mockProduct.sizes);
      expect(result.toppings).toEqual(mockProduct.toppings);
    });

    it('nên tự động gán DEFAULT_SIZES và DEFAULT_TOPPINGS nếu dữ liệu DB bị null', async () => {
      const mockProductWithoutOptions = {
        idProduct: 2,
        tenProduct: 'Cà phê đen',
        giaProduct: 25000,
        soLuong: 50,
        trangThaiBan: true,
        urlAnh: 'https://example.com/cafe-den.jpg',
        sizes: null,
        toppings: null,
      };
      mockProductRepository.findOne.mockResolvedValue(
        mockProductWithoutOptions,
      );

      const result = await service.findOne(2);

      expect(result.sizes).toEqual(DEFAULT_SIZES);
      expect(result.toppings).toEqual(DEFAULT_TOPPINGS);
    });

    it('nên ném lỗi NotFoundException khi sản phẩm không tồn tại', async () => {
      mockProductRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(999)).rejects.toThrow(
        'Không tìm thấy sản phẩm có id 999',
      );
    });
  });
});