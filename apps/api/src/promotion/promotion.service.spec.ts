import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
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

  const validPromotion = () => ({
    idPromotion: 'p-1',
    maPromotion: 'SALE20',
    giamGia: 20000,
    trangThaiHoatDong: true,
    hanPromotion: new Date('2099-01-01T00:00:00Z'),
  });

  beforeEach(() => {
    vi.resetAllMocks();
    service = new PromotionService(
      promotionRepo as unknown as Repository<Promotion>,
      orderRepo as unknown as Repository<Order>,
    );
  });

  it('creates a new promo code in uppercase', async () => {
    promotionRepo.findOne.mockResolvedValue(null);
    promotionRepo.create.mockImplementation((value) => value);
    promotionRepo.save.mockImplementation(async (value) => value);
    const dto = {
      maPromotion: 'sale20',
      giamGia: 20000,
      hanPromotion: new Date('2099-01-01T00:00:00Z'),
      trangThaiHoatDong: true,
    };
    const result = await service.taoMaMoi(dto);
    expect(promotionRepo.findOne).toHaveBeenCalledWith({ where: { maPromotion: 'SALE20' } });
    expect(promotionRepo.create).toHaveBeenCalledWith(expect.objectContaining({ maPromotion: 'SALE20' }));
    expect(result.maPromotion).toBe('SALE20');
    expect(promotionRepo.save).toHaveBeenCalledOnce();
  });

  it('rejects duplicate promo codes', async () => {
    promotionRepo.findOne.mockResolvedValue(validPromotion());
    await expect(service.taoMaMoi({
      maPromotion: 'sale20',
      giamGia: 20000,
      hanPromotion: new Date('2099-01-01T00:00:00Z'),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(promotionRepo.save).not.toHaveBeenCalled();
  });

  it('rejects unknown promo codes', async () => {
    promotionRepo.findOne.mockResolvedValue(null);
    await expect(service.kiemTraHopLe('missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(promotionRepo.findOne).toHaveBeenCalledWith({ where: { maPromotion: 'MISSING' } });
  });

  it('rejects disabled codes', async () => {
    promotionRepo.findOne.mockResolvedValue({ ...validPromotion(), trangThaiHoatDong: false });
    await expect(service.kiemTraHopLe('sale20')).rejects.toThrow('Mã khuyến mãi đã ngừng hoạt động');
  });

  it('rejects expired codes', async () => {
    promotionRepo.findOne.mockResolvedValue({ ...validPromotion(), hanPromotion: new Date('2000-01-01') });
    await expect(service.kiemTraHopLe('sale20')).rejects.toThrow('Mã khuyến mãi đã hết hạn');
  });

  it('accepts active unexpired codes', async () => {
    const promo = validPromotion();
    promotionRepo.findOne.mockResolvedValue(promo);
    await expect(service.kiemTraHopLe('sale20')).resolves.toEqual(promo);
  });

  it('cannot apply a code to missing order', async () => {
    orderRepo.findOne.mockResolvedValue(null);
    await expect(service.apDungMa('missing', 'SALE20')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cannot apply a code to an already-paid order', async () => {
    orderRepo.findOne.mockResolvedValue({ trangThai: TrangThaiDonHang.DA_NHAN });
    await expect(service.apDungMa('o-1', 'SALE20')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('applies a discount without allowing negative totals', async () => {
    const order = { idOrder: 'o-1', tongTien: 12000, trangThai: TrangThaiDonHang.DANG_THANH_TOAN, promotion: null };
    orderRepo.findOne.mockResolvedValue(order);
    promotionRepo.findOne.mockResolvedValue(validPromotion());
    orderRepo.save.mockImplementation(async (value) => value);
    const result = await service.apDungMa('o-1', 'sale20');
    expect(result.tongTien).toBe(0);
    expect(result.promotion?.maPromotion).toBe('SALE20');
    expect(orderRepo.save).toHaveBeenCalledOnce();
  });

  it('restores the previous discount when swapping promo codes', async () => {
    const oldPromo = { ...validPromotion(), idPromotion: 'p-old', giamGia: 5000 };
    const nextPromo = validPromotion();
    const order = { tongTien: 95000, trangThai: TrangThaiDonHang.DANG_THANH_TOAN, promotion: oldPromo };
    orderRepo.findOne.mockResolvedValue(order);
    promotionRepo.findOne.mockResolvedValue(nextPromo);
    orderRepo.save.mockImplementation(async (value) => value);
    const result = await service.apDungMa('o-1', 'sale20');
    expect(result.tongTien).toBe(80000); // 95000 + 5000 - 20000
  });

  it('does not reapply the same promo code twice', async () => {
    const promo = validPromotion();
    orderRepo.findOne.mockResolvedValue({ tongTien: 80000, trangThai: TrangThaiDonHang.DANG_THANH_TOAN, promotion: promo });
    promotionRepo.findOne.mockResolvedValue(promo);
    await expect(service.apDungMa('o-1', 'SALE20')).rejects.toThrow('Mã này đang được áp dụng');
    expect(orderRepo.save).not.toHaveBeenCalled();
  });

  it('removes a discount and restores order total', async () => {
    const order = { tongTien: 80000, trangThai: TrangThaiDonHang.DANG_THANH_TOAN, promotion: validPromotion() };
    orderRepo.findOne.mockResolvedValue(order);
    orderRepo.save.mockImplementation(async (value) => value);
    const result = await service.goMaGiamGia('o-1');
    expect(result.tongTien).toBe(100000);
    expect(result.promotion).toBeNull();
  });

  it('rejects removal when no code was applied', async () => {
    orderRepo.findOne.mockResolvedValue({ trangThai: TrangThaiDonHang.DANG_THANH_TOAN, promotion: null });
    await expect(service.goMaGiamGia('o-1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('toggles promo activation state', async () => {
    const promo = validPromotion();
    promotionRepo.findOne.mockResolvedValue(promo);
    promotionRepo.save.mockImplementation(async (value) => value);
    const result = await service.toggleStatus('p-1');
    expect(result.trangThaiHoatDong).toBe(false);
    expect(promotionRepo.save).toHaveBeenCalledWith(promo);
  });
});
