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


  describe('onModuleInit - khởi tạo dữ liệu sản phẩm', () => {
    it('tạo 5 sản phẩm mặc định nếu database đang trống', async () => {
      mockProductRepository.count.mockResolvedValue(0);
      mockProductRepository.save.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockProductRepository.save).toHaveBeenCalledOnce();
      const seeded = mockProductRepository.save.mock.calls[0][0];
      expect(seeded).toHaveLength(5);
      expect(seeded.map((p: any) => p.tenProduct)).toEqual([
        'Cà phê sữa', 'Cà phê đen', 'Cappuccino', 'Latte', 'Sinh tố bơ',
      ]);
      expect(seeded[0]).toEqual(expect.objectContaining({
        giaProduct: 30000,
        soLuong: 100,
        sizes: DEFAULT_SIZES,
        toppings: DEFAULT_TOPPINGS,
      }));
      expect(mockProductRepository.find).not.toHaveBeenCalled();
    });

    it('không tạo dữ liệu mẫu nếu đã có sản phẩm đầy đủ', async () => {
      const existing = [{
        idProduct: 1, sizes: DEFAULT_SIZES, toppings: DEFAULT_TOPPINGS,
      }];
      mockProductRepository.count.mockResolvedValue(1);
      mockProductRepository.find.mockResolvedValue(existing);

      await service.onModuleInit();

      expect(mockProductRepository.find).toHaveBeenCalledOnce();
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });

    it('bổ sung sizes và toppings mặc định cho sản phẩm cũ bị thiếu cả hai', async () => {
      const product: any = { idProduct: 1, sizes: null, toppings: undefined };
      mockProductRepository.count.mockResolvedValue(1);
      mockProductRepository.find.mockResolvedValue([product]);
      mockProductRepository.save.mockResolvedValue(product);

      await service.onModuleInit();

      expect(product.sizes).toEqual(DEFAULT_SIZES);
      expect(product.toppings).toEqual(DEFAULT_TOPPINGS);
      expect(mockProductRepository.save).toHaveBeenCalledWith(product);
    });

    it('chỉ bổ sung phần còn thiếu, giữ nguyên cấu hình tùy chọn của sản phẩm', async () => {
      const customSizes = [{ code: SIZE.S, label: 'Tùy chỉnh', extraPrice: 1200 }];
      const product: any = { idProduct: 1, sizes: customSizes, toppings: null };
      mockProductRepository.count.mockResolvedValue(1);
      mockProductRepository.find.mockResolvedValue([product]);

      await service.onModuleInit();

      expect(product.sizes).toBe(customSizes);
      expect(product.toppings).toEqual(DEFAULT_TOPPINGS);
      expect(mockProductRepository.save).toHaveBeenCalledWith(product);
    });

    it('lưu lại đúng những sản phẩm bị thiếu cấu hình trong danh sách hỗn hợp', async () => {
      const complete = { idProduct: 1, sizes: DEFAULT_SIZES, toppings: DEFAULT_TOPPINGS };
      const missingSizes: any = { idProduct: 2, sizes: null, toppings: DEFAULT_TOPPINGS };
      const missingToppings: any = { idProduct: 3, sizes: DEFAULT_SIZES, toppings: null };
      mockProductRepository.count.mockResolvedValue(3);
      mockProductRepository.find.mockResolvedValue([complete, missingSizes, missingToppings]);

      await service.onModuleInit();

      expect(mockProductRepository.save).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.save).toHaveBeenCalledWith(missingSizes);
      expect(mockProductRepository.save).toHaveBeenCalledWith(missingToppings);
    });
  });
});
