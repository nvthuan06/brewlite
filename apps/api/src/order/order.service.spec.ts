import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OrderService } from './order.service.js';
import { PaymentService } from '../payment/payment.service.js';
import { PhuongThucThanhToan, TrangThaiThanhToan } from '../payment/enum/payment.enum.js';
import { TrangThaiDonHang } from './enum/order.enum.js';
import { PromotionService } from '../promotion/promotion.service.js';

describe('OrderService', () => {
  let service: OrderService;
  let queryRunnerMock: any;
  let dataSourceMock: any;
  let paymentServiceMock: any;
  let promotionServiceMock: any; // Khai báo thêm biến cho PromotionService

  beforeEach(async () => {
    queryRunnerMock = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        findOne: vi.fn(),
        create: vi.fn((entityClass, data) => data),
        save: vi.fn().mockImplementation((entityClass, entity) => Promise.resolve(entity)),
      },
    };

    dataSourceMock = {
      createQueryRunner: vi.fn().mockReturnValue(queryRunnerMock),
    };

    paymentServiceMock = {
      CreatePayment: vi.fn(),
    };

    // Khởi tạo đối tượng mock cho PromotionService
    promotionServiceMock = {
      kiemTraHopLe: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: DataSource, useValue: dataSourceMock },
        { provide: PaymentService, useValue: paymentServiceMock },
        { provide: PromotionService, useValue: promotionServiceMock }, // Thêm Provider giả lập này vào Test Module
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
  });

  it('nên tạo đơn hàng thành công và gọi commitTransaction', async () => {
    const mockProduct = {
      idProduct: 1,
      soLuong: 10,
      giaProduct: 50000,
    };
    queryRunnerMock.manager.findOne.mockResolvedValue(mockProduct);

    const mockPaymentInfo = {
      payment: { idPayment: 'p-1', soTien: 100000, trangThai: TrangThaiThanhToan.PENDING },
      qrCodeUrl: 'https://qr.sepay.vn/...',
    };
    paymentServiceMock.CreatePayment.mockResolvedValue(mockPaymentInfo);

    // Mock hàm kiemTraHopLe trả về undefined nếu không truyền maPromotion
    promotionServiceMock.kiemTraHopLe.mockResolvedValue(undefined);

    const dto = {
      idempotencyKey: 'key-123',
      items: [
        { productId: 1, soLuong: 2, size: 'L', topping: 'Trân châu' },
      ],
    };

    const result = await service.CheckOut('user-uuid', dto as any);

    expect(queryRunnerMock.connect).toHaveBeenCalled();
    expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.release).toHaveBeenCalled();
    expect(result.order.tongTien).toBe(100000);
    expect(result.detail).toEqual(mockPaymentInfo);
  });

  it('nên throw BadRequestException và rollback nếu số lượng mua vượt tồn kho', async () => {
    const mockProduct = {
      idProduct: 1,
      soLuong: 1,
      giaProduct: 50000,
    };
    queryRunnerMock.manager.findOne.mockResolvedValue(mockProduct);

    const dto = {
      idempotencyKey: 'key-123',
      items: [
        { productId: 1, soLuong: 5, size: 'L', topping: 'Trân châu' },
      ],
    };

    await expect(service.CheckOut('user-uuid', dto as any)).rejects.toThrow(BadRequestException);
    expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunnerMock.release).toHaveBeenCalled();
  });
});