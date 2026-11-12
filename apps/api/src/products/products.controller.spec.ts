import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { SIZE, TOPPING } from '../order/enum/orderitem.enum.js';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProductsService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockProductsService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('nên gọi productsService.findAll và trả về danh sách sản phẩm', async () => {
      const mockProducts = [
        { idProduct: 1, tenProduct: 'Cà phê sữa', giaProduct: 30000 },
      ];
      mockProductsService.findAll.mockResolvedValue(mockProducts);

      const result = await controller.findAll();

      expect(mockProductsService.findAll).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockProducts);
    });
  });

  describe('findOne', () => {
    it('nên trả về chi tiết sản phẩm kèm tùy chọn size và topping', async () => {
      const mockDetail = {
        idProduct: 1,
        tenProduct: 'Cà phê sữa',
        giaProduct: 30000,
        soLuong: 100,
        trangThaiBan: true,
        urlAnh: 'https://example.com/cafe-sua.jpg',
        sizes: [{ code: SIZE.S, label: 'Size S', extraPrice: 0 }],
        toppings: [
          { code: TOPPING.TRAN_CHAU, label: 'Trân châu', extraPrice: 5000 },
        ],
      };
      mockProductsService.findOne.mockResolvedValue(mockDetail);

      const result = await controller.findOne(1);

      expect(mockProductsService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockDetail);
    });

    it('nên chuyển tiếp lỗi NotFoundException khi không tìm thấy sản phẩm', async () => {
      mockProductsService.findOne.mockRejectedValue(
        new NotFoundException('Không tìm thấy sản phẩm có id 999'),
      );

      await expect(controller.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});