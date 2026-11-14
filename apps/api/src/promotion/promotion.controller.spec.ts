import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';

describe('PromotionController - unit tests', () => {
  let controller: PromotionController;
  const serviceMock = {
    taoMaMoi: vi.fn(),
    findAll: vi.fn(),
    kiemTraHopLe: vi.fn(),
    apDungMa: vi.fn(),
    goMaGiamGia: vi.fn(),
    toggleStatus: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: {
            taoMaMoi: vi.fn(),
            findAll: vi.fn(),
            kiemTraHopLe: vi.fn(),
            apDungMa: vi.fn(),
            goMaGiamGia: vi.fn(),
            toggleStatus: vi.fn(),
          },
        },
      ],
    }).compile();
    controller = module.get<PromotionController>(PromotionController);
  });

  it('được khởi tạo', () => {
    expect(controller).toBeDefined();
  });

  it('TaoMa chuyển đúng DTO sang service và trả mã khuyến mãi', async () => {
    const dto = {
      maPromotion: 'SALE20', giamGia: 20000,
      hanPromotion: new Date('2099-01-01T00:00:00Z'),
    };
    const saved = { ...dto, idPromotion: 'p1' };
    serviceMock.taoMaMoi.mockResolvedValue(saved);

    await expect(controller.TaoMa(dto as any)).resolves.toEqual(saved);
    expect(serviceMock.taoMaMoi).toHaveBeenCalledWith(dto);
  });

  it('TaoMa chuyển tiếp BadRequestException nếu mã đã tồn tại', async () => {
    serviceMock.taoMaMoi.mockRejectedValue(new BadRequestException('Mã đã tồn tại'));
    await expect(controller.TaoMa({ maPromotion: 'SALE20' } as any))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('findAll trả về danh sách mã khuyến mãi', async () => {
    const promotions = [{ idPromotion: 'p1', maPromotion: 'SALE20' }];
    serviceMock.findAll.mockResolvedValue(promotions);

    await expect(controller.findAll()).resolves.toEqual(promotions);
    expect(serviceMock.findAll).toHaveBeenCalledOnce();
  });

  it('KiemTra truyền đúng mã khuyến mãi và trả kết quả hợp lệ', async () => {
    const promotion = { maPromotion: 'SALE20', trangThaiHoatDong: true };
    serviceMock.kiemTraHopLe.mockResolvedValue(promotion);

    await expect(controller.KiemTra('SALE20')).resolves.toEqual(promotion);
    expect(serviceMock.kiemTraHopLe).toHaveBeenCalledWith('SALE20');
  });

  it('KiemTra chuyển tiếp NotFoundException nếu mã không tồn tại', async () => {
    serviceMock.kiemTraHopLe.mockRejectedValue(new NotFoundException('Không tìm thấy mã'));
    await expect(controller.KiemTra('INVALID')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('TrangThai đổi trạng thái theo id promotion', async () => {
    const promotion = { idPromotion: 'p1', trangThaiHoatDong: false };
    serviceMock.toggleStatus.mockResolvedValue(promotion);

    await expect(controller.TrangThai('p1')).resolves.toEqual(promotion);
    expect(serviceMock.toggleStatus).toHaveBeenCalledWith('p1');
  });

  it('Xoa gọi chính xác goMaGiamGia với id được cung cấp', async () => {
    const result = { idOrder: 'o1', promotion: null, tongTien: 100000 };
    serviceMock.goMaGiamGia.mockResolvedValue(result);

    await expect(controller.Xoa('o1')).resolves.toEqual(result);
    expect(serviceMock.goMaGiamGia).toHaveBeenCalledWith('o1');
  });
});
