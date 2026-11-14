import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromotionService } from './promotion.service.js';
import { Promotion } from './entities/promotion.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { TrangThaiDonHang } from '../order/enum/order.enum.js';

describe('PromotionService - business rules', () => {
  const promotionRepo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    find: vi.fn(),
  };
  const orderRepo = { findOne: vi.fn(), save: vi.fn() };
  let service: PromotionService;
  let promotionRepo: {
    findOne: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
  };
  let orderRepo: {
    findOne: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    promotionRepo = {
      findOne: vi.fn(),
      create: vi.fn(),
      save: vi.fn(),
      find: vi.fn(),
    };

    orderRepo = {
      findOne: vi.fn(),
      save: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: promotionRepo,
        },
        {
          provide: getRepositoryToken(Order),
          useValue: orderRepo,
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  it('Promotion Service', () => {
    expect(service).toBeDefined();
  });

  describe('taoMaMoi', () => {
    it('nên ném lỗi BadRequestException nếu mã khuyến mãi đã tồn tại', async () => {
      const dto = {
        maPromotion: 'brew10',
        giamGia: 10000,
        hanPromotion: '2027-12-31',
      } as any;

      promotionRepo.findOne.mockResolvedValue({ idPromotion: 'promo-1' });

      await expect(service.taoMaMoi(dto)).rejects.toThrow(
        new BadRequestException('Mã khuyến mãi đã tồn tại'),
      );
      expect(promotionRepo.findOne).toHaveBeenCalledWith({
        where: { maPromotion: 'BREW10' },
      });
    });

    it('nên tạo mới và lưu mã khuyến mãi với chữ in hoa', async () => {
      const dto = {
        maPromotion: 'brew10',
        giamGia: 10000,
        hanPromotion: '2027-12-31',
      } as any;
      const createdEntity = {
        ...dto,
        maPromotion: 'BREW10',
        hanPromotion: new Date(dto.hanPromotion),
      };

      promotionRepo.findOne.mockResolvedValue(null);
      promotionRepo.create.mockReturnValue(createdEntity);
      promotionRepo.save.mockResolvedValue({
        idPromotion: 'promo-1',
        ...createdEntity,
      });

      const result = await service.taoMaMoi(dto);

      expect(promotionRepo.create).toHaveBeenCalledWith({
        ...dto,
        maPromotion: 'BREW10',
        hanPromotion: new Date(dto.hanPromotion),
      });
      expect(promotionRepo.save).toHaveBeenCalledWith(createdEntity);
      expect(result.maPromotion).toBe('BREW10');
    });
  });

  describe('findAll', () => {
    it('nên trả về danh sách tất cả mã khuyến mãi', async () => {
      const mockPromos = [{ idPromotion: '1' }, { idPromotion: '2' }];
      promotionRepo.find.mockResolvedValue(mockPromos);

      const result = await service.findAll();

      expect(promotionRepo.find).toHaveBeenCalled();
      expect(result).toEqual(mockPromos);
    });
  });

  describe('kiemTraHopLe', () => {
    it('nên ném lỗi NotFoundException nếu mã không tồn tại', async () => {
      promotionRepo.findOne.mockResolvedValue(null);

      await expect(service.kiemTraHopLe('invalid')).rejects.toThrow(
        new NotFoundException('Mã khuyến mãi không tồn tại'),
      );
    });

    it('nên ném lỗi BadRequestException nếu mã đã ngừng hoạt động', async () => {
      promotionRepo.findOne.mockResolvedValue({
        maPromotion: 'BREW10',
        trangThaiHoatDong: false,
        hanPromotion: new Date(Date.now() + 86400000),
      });

      await expect(service.kiemTraHopLe('brew10')).rejects.toThrow(
        new BadRequestException('Mã khuyến mãi đã ngừng hoạt động'),
      );
    });

    it('nên ném lỗi BadRequestException nếu mã đã hết hạn', async () => {
      promotionRepo.findOne.mockResolvedValue({
        maPromotion: 'BREW10',
        trangThaiHoatDong: true,
        hanPromotion: new Date(Date.now() - 86400000), // Ngày hôm qua
      });

      await expect(service.kiemTraHopLe('brew10')).rejects.toThrow(
        new BadRequestException('Mã khuyến mãi đã hết hạn'),
      );
    });

    it('nên trả về thông tin mã khuyến mãi nếu hợp lệ', async () => {
      const validPromo = {
        idPromotion: 'promo-1',
        maPromotion: 'BREW10',
        trangThaiHoatDong: true,
        hanPromotion: new Date(Date.now() + 86400000),
      };
      promotionRepo.findOne.mockResolvedValue(validPromo);

      const result = await service.kiemTraHopLe('brew10');

      expect(result).toEqual(validPromo);
    });
  });

  describe('apDungMa', () => {
    const validPromo = {
      idPromotion: 'promo-new',
      maPromotion: 'GIAM20K',
      giamGia: 20000,
      trangThaiHoatDong: true,
      hanPromotion: new Date(Date.now() + 86400000),
    };

    it('nên ném lỗi NotFoundException nếu không tìm thấy đơn hàng', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.apDungMa('order-1', 'GIAM20K')).rejects.toThrow(
        new NotFoundException('Không tìm thấy đơn'),
      );
    });

    it('nên ném lỗi BadRequestException nếu đơn hàng ở trạng thái DA_NHAN', async () => {
      orderRepo.findOne.mockResolvedValue({
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DA_NHAN,
      });

      await expect(service.apDungMa('order-1', 'GIAM20K')).rejects.toThrow(
        new BadRequestException(
          'Đơn hàng đã thanh toán, không thể áp dụng mã',
        ),
      );
    });

    it('nên ném lỗi BadRequestException nếu mã mới trùng với mã đang áp dụng trên đơn', async () => {
      orderRepo.findOne.mockResolvedValue({
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        tongTien: 50000,
        promotion: { idPromotion: 'promo-new', giamGia: 20000 },
      });
      promotionRepo.findOne.mockResolvedValue(validPromo);

      await expect(service.apDungMa('order-1', 'GIAM20K')).rejects.toThrow(
        new BadRequestException('Mã này đang được áp dụng cho đơn hàng'),
      );
    });

    it('nên áp dụng mã mới cho đơn chưa có mã và trừ đúng tổng tiền', async () => {
      const mockOrder = {
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        tongTien: 50000,
        promotion: null,
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);
      promotionRepo.findOne.mockResolvedValue(validPromo);
      orderRepo.save.mockImplementation(async (order) => order);

      const result = await service.apDungMa('order-1', 'GIAM20K');

      expect(result.tongTien).toBe(30000);
      expect(result.promotion).toEqual(validPromo);
      expect(orderRepo.save).toHaveBeenCalledWith(mockOrder);
    });

    it('nên hoàn lại tiền mã cũ trước khi trừ tiền mã mới nếu đơn đã có mã khác', async () => {
      const mockOrder = {
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        tongTien: 40000, // Giá gốc 50k đã giảm 10k từ mã cũ
        promotion: { idPromotion: 'promo-old', giamGia: 10000 },
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);
      promotionRepo.findOne.mockResolvedValue(validPromo); // Giảm 20k
      orderRepo.save.mockImplementation(async (order) => order);

      const result = await service.apDungMa('order-1', 'GIAM20K');

      // 40000 + 10000 (mã cũ) - 20000 (mã mới) = 30000
      expect(result.tongTien).toBe(30000);
      expect(result.promotion).toEqual(validPromo);
    });

    it('nên giới hạn tổng tiền tối thiểu là 0 nếu mức giảm lớn hơn tổng tiền', async () => {
      const mockOrder = {
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        tongTien: 15000,
        promotion: null,
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);
      promotionRepo.findOne.mockResolvedValue(validPromo); // Giảm 20k
      orderRepo.save.mockImplementation(async (order) => order);

      const result = await service.apDungMa('order-1', 'GIAM20K');

      expect(result.tongTien).toBe(0);
    });
  });

  describe('goMaGiamGia', () => {
    it('nên ném lỗi NotFoundException nếu không tìm thấy đơn hàng', async () => {
      orderRepo.findOne.mockResolvedValue(null);

      await expect(service.goMaGiamGia('order-1')).rejects.toThrow(
        new NotFoundException('Mã khuyến mãi không tồn tại'),
      );
    });

    it('nên ném lỗi BadRequestException nếu đơn hàng đã thanh toán (DA_NHAN)', async () => {
      orderRepo.findOne.mockResolvedValue({
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DA_NHAN,
      });

      await expect(service.goMaGiamGia('order-1')).rejects.toThrow(
        new BadRequestException(
          'Đơn hàng đã thanh toán, không thể áp dụng mã',
        ),
      );
    });

    it('nên ném lỗi BadRequestException nếu đơn hàng chưa áp dụng mã nào', async () => {
      orderRepo.findOne.mockResolvedValue({
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        promotion: null,
      });

      await expect(service.goMaGiamGia('order-1')).rejects.toThrow(
        new BadRequestException('Đơn hàng chưa áp dụng mã nào'),
      );
    });

    it('nên gỡ mã giảm giá và cộng lại tiền vào tổng tiền đơn hàng', async () => {
      const mockOrder = {
        idOrder: 'order-1',
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        tongTien: 30000,
        promotion: { idPromotion: 'promo-1', giamGia: 15000 },
      };
      orderRepo.findOne.mockResolvedValue(mockOrder);
      orderRepo.save.mockImplementation(async (order) => order);

      const result = await service.goMaGiamGia('order-1');

      expect(result.tongTien).toBe(45000);
      expect(result.promotion).toBeNull();
      expect(orderRepo.save).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('toggleStatus', () => {
    it('nên ném lỗi NotFoundException nếu không tìm thấy mã khuyến mãi', async () => {
      promotionRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleStatus('promo-1')).rejects.toThrow(
        new NotFoundException('Không tìm thấy mã khuyến mãi'),
      );
    });

    it('nên đảo ngược trạng thái hoạt động của mã và lưu lại', async () => {
      const mockPromo = {
        idPromotion: 'promo-1',
        trangThaiHoatDong: true,
      };
      promotionRepo.findOne.mockResolvedValue(mockPromo);
      promotionRepo.save.mockImplementation(async (promo) => promo);

      const result = await service.toggleStatus('promo-1');

      expect(result.trangThaiHoatDong).toBe(false);
      expect(promotionRepo.save).toHaveBeenCalledWith(mockPromo);
    });
  });
});
