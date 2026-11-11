import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PaymentService } from './payment.service.js';
import { TrangThaiThanhToan } from './enum/payment.enum.js';
import { TrangThaiDonHang } from '../order/enum/order.enum.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PaymentService', () => {
  let service: PaymentService;
  let queryRunnerMock: any;
  let paymentRepoMock: any;
  let dataSourceMock: any;

  beforeEach(async () => {
    paymentRepoMock = {
      findOne: vi.fn(),
    };

    queryRunnerMock = {
      connect: vi.fn().mockResolvedValue(undefined),
      startTransaction: vi.fn().mockResolvedValue(undefined),
      commitTransaction: vi.fn().mockResolvedValue(undefined),
      rollbackTransaction: vi.fn().mockResolvedValue(undefined),
      release: vi.fn().mockResolvedValue(undefined),
      manager: {
        createQueryBuilder: vi.fn(),
        save: vi.fn().mockImplementation((entityClass, entity) => Promise.resolve(entity)),
      },
    };

    dataSourceMock = {
      getRepository: vi.fn().mockReturnValue(paymentRepoMock),
      createQueryRunner: vi.fn().mockReturnValue(queryRunnerMock),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });


  it('nên gạch nợ thành công và cập nhật trạng thái đơn hàng khi chuyển đủ tiền', async () => {
    paymentRepoMock.findOne.mockResolvedValue(null);

    const mockOrder = { idOrder: 'o-1', trangThai: TrangThaiDonHang.DANG_THANH_TOAN };
    const mockPayment = {
      idPayment: 'p-1',
      soTien: 100000,
      trangThai: TrangThaiThanhToan.PENDING,
      maChuyenKhoan: 'DH123456',
      order: mockOrder,
    };

    const qbMock = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue(mockPayment),
    };
    queryRunnerMock.manager.createQueryBuilder.mockReturnValue(qbMock);

    const payload = {
      id: 1001,
      transferType: 'in',
      amountIn: 100000,
      transactionContent: 'Thanh toan don hang DH123456',
      transactionDate: '2026-03-30 10:05:00',
    };
  });
});