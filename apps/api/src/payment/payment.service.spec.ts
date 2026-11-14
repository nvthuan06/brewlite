import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataSource, QueryRunner } from 'typeorm';
import { PaymentService } from './payment.service.js';
import { Payment } from './entities/payment.entity.js';
import { PhuongThucThanhToan, TrangThaiThanhToan } from './enum/payment.enum.js';
import { TrangThaiDonHang } from '../order/enum/order.enum.js';
import { Product } from '../products/entities/product.entity.js';

describe('PaymentService - payment and webhook unit tests', () => {
  const paymentRepo = { findOne: vi.fn() };
  const query = {
    leftJoinAndSelect: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getOne: vi.fn(),
  };
  const manager = {
    create: vi.fn(),
    save: vi.fn(),
    createQueryBuilder: vi.fn(),
  };
  const runner = {
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
    isReleased: false,
    manager,
  };
  const ds = { getRepository: vi.fn(), createQueryRunner: vi.fn() };
  let service: PaymentService;

  const payload = (amount = 100000) => ({
    id: 104,
    transferType: 'in',
    transferAmount: amount,
    content: 'PAY DH12345',
    transactionDate: new Date().toISOString(),
  });
  const pendingPayment = (ageMinutes = 1) => ({
    idPayment: 'pay-1',
    soTien: 100000,
    trangThai: TrangThaiThanhToan.PENDING,
    maChuyenKhoan: 'DH12345',
    order: {
      idOrder: 'ord-1',
      ngayDatHang: new Date(Date.now() - ageMinutes * 60_000),
      trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
      orderitem: [{ product: { soLuong: 10 }, soLuong: 2 }],
    },
  });

  beforeEach(() => {
    vi.resetAllMocks();
    query.leftJoinAndSelect.mockReturnThis();
    query.where.mockReturnThis();
    query.andWhere.mockReturnThis();
    manager.createQueryBuilder.mockReturnValue(query);
    manager.create.mockImplementation((_entity, value) => value);
    manager.save.mockImplementation(async (...args) => args.at(-1));
    runner.isReleased = false;
    ds.getRepository.mockReturnValue(paymentRepo);
    ds.createQueryRunner.mockReturnValue(runner);
    paymentRepo.findOne.mockResolvedValue(null);
    runner.connect.mockResolvedValue(undefined);
    runner.startTransaction.mockResolvedValue(undefined);
    runner.commitTransaction.mockResolvedValue(undefined);
    runner.rollbackTransaction.mockResolvedValue(undefined);
    runner.release.mockResolvedValue(undefined);
    service = new PaymentService(ds as unknown as DataSource);
  });

  it('creates a PENDING wallet payment with bank QR URL', async () => {
    const order = { idOrder: 'ord-1' };
    const result = await service.CreatePayment(
      runner as unknown as QueryRunner,
      order as never,
      100000,
      PhuongThucThanhToan.VI,
    );
    expect(manager.create).toHaveBeenCalledWith(Payment, expect.objectContaining({
      soTien: 100000,
      phuongThuc: PhuongThucThanhToan.VI,
      trangThai: TrangThaiThanhToan.PENDING,
    }));
    expect(manager.save).toHaveBeenCalledOnce();
    expect(result?.qrCodeUrl).toContain('amount=100000');
  });

  it('does not generate a payment for unsupported method', async () => {
    const result = await service.CreatePayment(runner as unknown as QueryRunner, {} as never, 1000, PhuongThucThanhToan.THE);
    expect(result).toBeNull();
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('ignores outgoing webhook transactions', async () => {
    const result = await service.handWeHook({ ...payload(), transferType: 'out' });
    expect(result.success).toBe(true);
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
  });

  it('ignores webhook transactions with nonpositive amount', async () => {
    const result = await service.handWeHook(payload(0));
    expect(result.success).toBe(true);
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
  });

  it('prevents duplicate processing by idempotency key', async () => {
    paymentRepo.findOne.mockResolvedValue({ idPayment: 'existing' });
    const result = await service.handWeHook(payload());
    expect(result.message).toContain('Idempotency');
    expect(ds.createQueryRunner).not.toHaveBeenCalled();
  });

  it('rolls back and returns success when the transfer has no matching payment', async () => {
    query.getOne.mockResolvedValue(null);
    const result = await service.handWeHook(payload());
    expect(result.message).toBe('Không thấy đơn hàng');
    expect(runner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('marks a sufficiently paid order as received and decrements inventory', async () => {
    const payment = pendingPayment();
    query.getOne.mockResolvedValue(payment);
    const result = await service.handWeHook(payload());
    expect(result.success).toBe(true);
    expect(payment.trangThai).toBe(TrangThaiThanhToan.SUCCESS_PAYMENT);
    expect(payment.order.trangThai).toBe(TrangThaiDonHang.DA_NHAN);
    expect(payment.order.orderitem[0].product.soLuong).toBe(8);
    expect(manager.save).toHaveBeenCalledWith(Product, payment.order.orderitem[0].product);
    expect(runner.commitTransaction).toHaveBeenCalledOnce();
    expect(runner.release).toHaveBeenCalledOnce();
  });

  it('prevents stock count dropping below zero', async () => {
    const payment = pendingPayment();
    payment.order.orderitem[0].product.soLuong = 1;
    query.getOne.mockResolvedValue(payment);
    await service.handWeHook(payload());
    expect(payment.order.orderitem[0].product.soLuong).toBe(0);
  });

  it('marks insufficient transfers as failed without updating order status', async () => {
    const payment = pendingPayment();
    query.getOne.mockResolvedValue(payment);
    const result = await service.handWeHook(payload(50000));
    expect(result.success).toBe(true);
    expect(payment.trangThai).toBe(TrangThaiThanhToan.FAIL_PAYMENT);
    expect(payment.order.trangThai).toBe(TrangThaiDonHang.DANG_THANH_TOAN);
    expect(runner.commitTransaction).toHaveBeenCalledOnce();
  });

  it('cancels payments received after the 15-minute window', async () => {
    const payment = pendingPayment(16);
    query.getOne.mockResolvedValue(payment);
    const result = await service.handWeHook(payload());
    expect(result.message).toContain('trễ');
    expect(payment.trangThai).toBe(TrangThaiThanhToan.FAIL_PAYMENT);
    expect(payment.order.trangThai).toBe(TrangThaiDonHang.HUY);
    expect(runner.commitTransaction).toHaveBeenCalledOnce();
  });

  it('rolls back and rethrows unexpected database errors', async () => {
    query.getOne.mockRejectedValue(new Error('DB query failure'));
    await expect(service.handWeHook(payload())).rejects.toThrow('DB query failure');
    expect(runner.rollbackTransaction).toHaveBeenCalledOnce();
    expect(runner.release).toHaveBeenCalledOnce();
  });
});
