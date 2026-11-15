import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CreatePromotionDto } from './dto/CreatePromotion.dto.js';

describe('PromotionController', () => {
  let controller: PromotionController;
  // Khai báo kiểu cho service mock để TS hiểu các hàm mock
  let promotionService: {
    taoMaMoi: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    kiemTraHopLe: ReturnType<typeof vi.fn>;
    toggleStatus: ReturnType<typeof vi.fn>;
    goMaGiamGia: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Khởi tạo các hàm mock bằng vitest
    promotionService = {
      taoMaMoi: vi.fn(),
      findAll: vi.fn(),
      kiemTraHopLe: vi.fn(),
      toggleStatus: vi.fn(),
      goMaGiamGia: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: promotionService, // Inject service mock vào
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('TaoMa (POST /promotion)', () => {
    it('API-03: nên gọi service.taoMaMoi với đúng DTO và trả về kết quả', async () => {
      const createDto: CreatePromotionDto = {
        maPromotion: 'BREW2026',
        giamGia: 20000,
        hanPromotion: new Date().toISOString(),
      } as any;
      const expectedResult = { idPromotion: 'promo-1', ...createDto };

      // Giả lập kết quả trả về của service
      promotionService.taoMaMoi.mockResolvedValue(expectedResult);

      const result = await controller.TaoMa(createDto);

      // Kiểm tra Controller có gọi đúng hàm của Service với dữ liệu DTO không
      expect(promotionService.taoMaMoi).toHaveBeenCalledWith(createDto);
      // Kiểm tra kết quả Controller trả về có khớp với Service không
      expect(result).toEqual(expectedResult);
    });
  });

  describe('findAll (GET /promotion)', () => {
    it('API-04: nên gọi service.findAll và trả về danh sách mã khuyến mãi', async () => {
      const expectedResult = [{ idPromotion: 'promo-1' }, { idPromotion: 'promo-2' }];
      promotionService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(promotionService.findAll).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });
  });

  describe('KiemTra (GET /promotion/validate/:maPromotion)', () => {
    it('API-05: nên gọi service.kiemTraHopLe và trả về thông tin mã hợp lệ', async () => {
      const maGiamGia = 'BREW10';
      const expectedResult = { idPromotion: 'promo-1', maPromotion: 'BREW10' };
      promotionService.kiemTraHopLe.mockResolvedValue(expectedResult);

      const result = await controller.KiemTra(maGiamGia);

      expect(promotionService.kiemTraHopLe).toHaveBeenCalledWith(maGiamGia);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('TrangThai (PATCH /promotion/:id/toggle)', () => {
    it('API-06: nên gọi service.toggleStatus để đổi trạng thái mã', async () => {
      const promoId = 'promo-1';
      const expectedResult = { idPromotion: promoId, trangThaiHoatDong: false };
      promotionService.toggleStatus.mockResolvedValue(expectedResult);

      const result = await controller.TrangThai(promoId);

      expect(promotionService.toggleStatus).toHaveBeenCalledWith(promoId);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('Xoa (DELETE /promotion/:id)', () => {
    it('API-07: nên gọi service.goMaGiamGia để gỡ mã khỏi đơn hàng', async () => {
      const orderId = 'order-123'; // Theo logic code của bạn, endpoint đang nhận idOrder
      const expectedResult = { idOrder: orderId, promotion: null, tongTien: 50000 };
      promotionService.goMaGiamGia.mockResolvedValue(expectedResult);

      const result = await controller.Xoa(orderId);

      expect(promotionService.goMaGiamGia).toHaveBeenCalledWith(orderId);
      expect(result).toEqual(expectedResult);
    });
  });
});