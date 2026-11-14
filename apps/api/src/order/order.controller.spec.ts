import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { TrangThaiDonHang } from './enum/order.enum.js';

describe('OrderController - unit tests', () => {
  let controller: OrderController;
  const serviceMock = {
    CheckOut: vi.fn(),
    updateOrderStatus: vi.fn(),
    cancelOrder: vi.fn(),
    myOrders: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [{ provide: OrderService, useValue: serviceMock }],
    }).compile();
    controller = module.get<OrderController>(OrderController);
  });

  it('được khởi tạo', () => {
    expect(controller).toBeDefined();
  });

  it('checkout lấy đúng userId từ JWT và trả dữ liệu cùng thông báo', async () => {
    const dto = { items: [{ productId: 1, soLuong: 2 }] };
    const order = { order: { idOrder: 'o1' }, detail: { qrCodeUrl: 'qr' } };
    serviceMock.CheckOut.mockResolvedValue(order);

    const result = await controller.CheckOut({ user: { userId: 'u1' } } as any, dto as any);

    expect(serviceMock.CheckOut).toHaveBeenCalledWith('u1', dto);
    expect(result).toEqual({ data: order, message: 'Tạo đơn hàng thành công' });
  });

  it('checkout chuyển tiếp lỗi từ service', async () => {
    serviceMock.CheckOut.mockRejectedValue(new Error('Database failure'));
    await expect(controller.CheckOut({ user: { userId: 'u1' } } as any, { items: [] } as any))
      .rejects.toThrow('Database failure');
  });

  it('updateStatus ưu tiên req.user.id nếu tồn tại', async () => {
    const order = { idOrder: 'o1', trangThai: TrangThaiDonHang.DA_NHAN };
    const dto = { trangThai: TrangThaiDonHang.DA_NHAN };
    serviceMock.updateOrderStatus.mockResolvedValue(order);

    const result = await controller.updateStatus('o1', {
      user: { id: 'staff-1', sub: 'staff-2' },
    }, dto);

    expect(serviceMock.updateOrderStatus)
      .toHaveBeenCalledWith('o1', 'staff-1', TrangThaiDonHang.DA_NHAN);
    expect(result).toEqual({
      data: order, message: 'Đã cập nhật trạng thái đơn hàng sang DA_NHAN',
    });
  });

  it('updateStatus dùng sub khi request không có id', async () => {
    serviceMock.updateOrderStatus.mockResolvedValue({});
    await controller.updateStatus('o1', { user: { sub: 'staff-sub' } }, {
      trangThai: TrangThaiDonHang.HUY,
    });
    expect(serviceMock.updateOrderStatus)
      .toHaveBeenCalledWith('o1', 'staff-sub', TrangThaiDonHang.HUY);
  });

  it('updateStatus sử dụng staff_mock_id theo logic controller khi request thiếu user', async () => {
    serviceMock.updateOrderStatus.mockResolvedValue({});
    await controller.updateStatus('o1', {}, { trangThai: TrangThaiDonHang.THAT_BAI });
    expect(serviceMock.updateOrderStatus)
      .toHaveBeenCalledWith('o1', 'staff_mock_id', TrangThaiDonHang.THAT_BAI);
  });

  it('cancelOrder lấy đúng req.user.id, trả về dữ liệu và thông báo', async () => {
    const cancelled = { idOrder: 'o1', trangThai: TrangThaiDonHang.HUY };
    serviceMock.cancelOrder.mockResolvedValue(cancelled);

    const result = await controller.cancelOrder({ user: { id: 'u1' } }, 'o1');
    expect(serviceMock.cancelOrder).toHaveBeenCalledWith('u1', 'o1');
    expect(result).toEqual({ data: cancelled, message: 'Hủy đơn hàng thành công' });
  });

  it('cancelOrder sử dụng dữ liệu mock khi request không có user', async () => {
    serviceMock.cancelOrder.mockResolvedValue({});
    await controller.cancelOrder({}, 'o1');
    expect(serviceMock.cancelOrder).toHaveBeenCalledWith('du_lieu_mock', 'o1');
  });

  it('myOrders chỉ truyền ID người dùng đang đăng nhập', async () => {
    const orders = [{ idOrder: 'o1' }];
    serviceMock.myOrders.mockResolvedValue(orders);

    const result = await controller.myOrders({ user: { userId: 'u1' } } as any);
    expect(serviceMock.myOrders).toHaveBeenCalledWith('u1');
    expect(result).toEqual({
      data: orders, message: 'Lấy danh sách đơn hàng thành công',
    });
  });

  it('findAll trả về toàn bộ dữ liệu từ service', async () => {
    const orders = [{ idOrder: 'o1' }, { idOrder: 'o2' }];
    serviceMock.findAll.mockResolvedValue(orders);
    await expect(controller.TimTatCaHoaDon()).resolves.toEqual(orders);
    expect(serviceMock.findAll).toHaveBeenCalledOnce();
  });

  it('findOne trả về đơn hàng cùng thông báo', async () => {
    const order = { idOrder: 'o1' };
    serviceMock.findOne.mockResolvedValue(order);
    await expect(controller.findOne('o1')).resolves.toEqual({
      data: order, message: 'Lấy thông tin đơn hàng thành công',
    });
    expect(serviceMock.findOne).toHaveBeenCalledWith('o1');
  });

  it('findOne chuyển tiếp NotFoundException khi đơn không tồn tại', async () => {
    serviceMock.findOne.mockRejectedValue(new NotFoundException('Không tìm thấy đơn hàng'));
    await expect(controller.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
