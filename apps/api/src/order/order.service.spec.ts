import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { OrderService } from './order.service.js';
import { PaymentService } from '../payment/payment.service.js';
import {
  TrangThaiThanhToan,
} from '../payment/enum/payment.enum.js';
import { PromotionService } from '../promotion/promotion.service.js';
import { User } from '../users/entities/user.entity.js';

describe('OrderService', () => {
  let service: OrderService;
  let queryRunnerMock: any;
  let dataSourceMock: any;
  let paymentServiceMock: any;
  let promotionServiceMock: any;

  const userId = '550e8400-e29b-41d4-a716-446655440000';

  const mockUser = {
    idUser: userId,
    tenUser: 'Nguyen Van A',
    email: 'test@gmail.com',
    passwordHash: 'hashed-password',
    vaiTro: 'KHACH_HANG',
    diemThuong: 0,
  };

  beforeEach(async () => {
    queryRunnerMock = {
      connect: vi.fn().mockResolvedValue(undefined),

      startTransaction: vi.fn().mockResolvedValue(undefined),

      commitTransaction: vi.fn().mockResolvedValue(undefined),

      rollbackTransaction: vi.fn().mockResolvedValue(undefined),

      release: vi.fn().mockResolvedValue(undefined),

      manager: {
        findOne: vi.fn(),

        // Mock kiểm tra User theo idUser (UUID)
        findOneBy: vi.fn().mockResolvedValue(mockUser),

        create: vi.fn((entityClass, data) => data),

        save: vi.fn().mockImplementation(
          (entityClass, entity) => Promise.resolve(entity),
        ),
      },
    };

    dataSourceMock = {
      createQueryRunner: vi.fn().mockReturnValue(queryRunnerMock),
    };

    paymentServiceMock = {
      CreatePayment: vi.fn(),
    };

    promotionServiceMock = {
      kiemTraHopLe: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          OrderService,
          {
            provide: DataSource,
            useValue: dataSourceMock,
          },
          {
            provide: PaymentService,
            useValue: paymentServiceMock,
          },
          {
            provide: PromotionService,
            useValue: promotionServiceMock,
          },
        ],
      }).compile();

    service = module.get<OrderService>(OrderService);
  });

  // ==========================================
  // TC01: Tạo đơn hàng thành công
  // ==========================================

  it('nên tạo đơn hàng thành công và gọi commitTransaction', async () => {
    const mockProduct = {
      idProduct: 1,
      soLuong: 10,
      giaProduct: 50000,
    };

    queryRunnerMock.manager.findOne.mockResolvedValue(mockProduct);

    const mockPaymentInfo = {
      payment: {
        idPayment: 'p-1',
        soTien: 100000,
        trangThai: TrangThaiThanhToan.PENDING,
      },
      qrCodeUrl: 'https://qr.sepay.vn/...',
    };

    paymentServiceMock.CreatePayment.mockResolvedValue(mockPaymentInfo);

    const dto = {
      idempotencyKey: 'key-123',
      items: [
        {
          productId: 1,
          soLuong: 2,
          size: 'L',
          topping: 'Trân châu',
        },
      ],
    };

    const result = await service.CheckOut(userId, dto as any);

    // Kiểm tra User tồn tại
    expect(queryRunnerMock.manager.findOneBy).toHaveBeenCalledWith(
      User,
      { idUser: userId },
    );

    // Kiểm tra transaction
    expect(queryRunnerMock.connect).toHaveBeenCalled();
    expect(queryRunnerMock.startTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.commitTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.rollbackTransaction).not.toHaveBeenCalled();
    expect(queryRunnerMock.release).toHaveBeenCalled();

    // Kiểm tra kết quả
    expect(result.order.tongTien).toBe(100000);
    expect(result.detail).toEqual(mockPaymentInfo);
  });

  // ==========================================
  // TC02: Số lượng mua vượt tồn kho
  // ==========================================

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
        {
          productId: 1,
          soLuong: 5,
          size: 'L',
          topping: 'Trân châu',
        },
      ],
    };

    await expect(
      service.CheckOut(userId, dto as any),
    ).rejects.toThrow(BadRequestException);

    expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunnerMock.release).toHaveBeenCalled();
  });

  // ==========================================
  // TC03: User không tồn tại
  // ==========================================

  it('nên throw BadRequestException khi User không tồn tại', async () => {
    queryRunnerMock.manager.findOneBy.mockResolvedValue(null);

    const dto = {
      idempotencyKey: 'key-456',
      items: [
        {
          productId: 1,
          soLuong: 1,
          size: 'M',
          topping: 'Trân châu',
        },
      ],
    };

    await expect(
      service.CheckOut(userId, dto as any),
    ).rejects.toThrow(BadRequestException);

    expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.release).toHaveBeenCalled();
    expect(paymentServiceMock.CreatePayment).not.toHaveBeenCalled();
  });
});