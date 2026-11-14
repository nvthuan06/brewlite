import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { TrangThaiDonHang } from './enum/order.enum.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('OrderController - unit tests', () => {
  let controller: OrderController;
  let orderService: {
    CheckOut: ReturnType<typeof vi.fn>;
    updateOrderStatus: ReturnType<typeof vi.fn>;
    cancelOrder: ReturnType<typeof vi.fn>;
    myOrders: ReturnType<typeof vi.fn>;
    findAll: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    orderService = {
      CheckOut: vi.fn(),
      updateOrderStatus: vi.fn(),
      cancelOrder: vi.fn(),
      myOrders: vi.fn(),
      findAll: vi.fn(),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: orderService,
        },
      ],
    }).compile();
    controller = module.get<OrderController>(OrderController);
  });

  it('được khởi tạo', () => {
    expect(controller).toBeDefined();
  });

  describe('CheckOut', () => {
    it('nên tạo đơn hàng mới và trả về thông báo thành công', async () => {
      const mockReq = {
        user: { userId: 'user-123', email: 'test@brewlite.com' },
      } as any;
      const createOrderDto = {
        items: [{ productId: 1, soLuong: 2, size: 'M' }],
      } as any;
      const mockCreatedOrder = { idOrder: 'order-1', tongTien: 40000 };

      orderService.CheckOut.mockResolvedValue(mockCreatedOrder);

      const result = await controller.CheckOut(mockReq, createOrderDto);

      expect(orderService.CheckOut).toHaveBeenCalledWith(
        'user-123',
        createOrderDto,
      );
      expect(result).toEqual({
        data: mockCreatedOrder,
        message: 'Tạo đơn hàng thành công',
      });
    });
  });

  describe('updateStatus', () => {
    it('nên cập nhật trạng thái đơn hàng với req.user.id', async () => {
      const idOrder = 'order-1';
      const mockReq = { user: { id: 'staff-01' } };
      const updateDto = { trangThai: TrangThaiDonHang.DA_NHAN } as any;
      const mockUpdated = { idOrder, trangThai: TrangThaiDonHang.DA_NHAN };

      orderService.updateOrderStatus.mockResolvedValue(mockUpdated);

      const result = await controller.updateStatus(idOrder, mockReq, updateDto);

      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        idOrder,
        'staff-01',
        updateDto.trangThai,
      );
      expect(result).toEqual({
        data: mockUpdated,
        message: `Đã cập nhật trạng thái đơn hàng sang ${updateDto.trangThai}`,
      });
    });

    it('nên dùng fallback staff_mock_id nếu req.user không có id hoặc sub', async () => {
      const idOrder = 'order-1';
      const mockReq = {};
      const updateDto = { trangThai: TrangThaiDonHang.HOAN_TAT } as any;
      const mockUpdated = { idOrder, trangThai: TrangThaiDonHang.HOAN_TAT };

      orderService.updateOrderStatus.mockResolvedValue(mockUpdated);

      const result = await controller.updateStatus(idOrder, mockReq, updateDto);

      expect(orderService.updateOrderStatus).toHaveBeenCalledWith(
        idOrder,
        'staff_mock_id',
        updateDto.trangThai,
      );
      expect(result).toEqual({
        data: mockUpdated,
        message: `Đã cập nhật trạng thái đơn hàng sang ${updateDto.trangThai}`,
      });
    });
  });

  describe('cancelOrder', () => {
    it('nên hủy đơn hàng với req.user.id', async () => {
      const idOrder = 'order-1';
      const mockReq = { user: { id: 'user-123' } };
      const mockCancelled = { idOrder, trangThai: TrangThaiDonHang.HUY };

      orderService.cancelOrder.mockResolvedValue(mockCancelled);

      const result = await controller.cancelOrder(mockReq, idOrder);

      expect(orderService.cancelOrder).toHaveBeenCalledWith(
        'user-123',
        idOrder,
      );
      expect(result).toEqual({
        data: mockCancelled,
        message: 'Hủy đơn hàng thành công',
      });
    });

    it('nên dùng fallback du_lieu_mock khi không có req.user', async () => {
      const idOrder = 'order-1';
      const mockReq = {};
      const mockCancelled = { idOrder, trangThai: TrangThaiDonHang.HUY };

      orderService.cancelOrder.mockResolvedValue(mockCancelled);

      const result = await controller.cancelOrder(mockReq, idOrder);

      expect(orderService.cancelOrder).toHaveBeenCalledWith(
        'du_lieu_mock',
        idOrder,
      );
      expect(result).toEqual({
        data: mockCancelled,
        message: 'Hủy đơn hàng thành công',
      });
    });
  });

  describe('myOrders', () => {
    it('nên trả về danh sách đơn hàng của người dùng hiện tại', async () => {
      const mockReq = {
        user: { userId: 'user-123', email: 'test@brewlite.com' },
      } as any;
      const mockOrders = [{ idOrder: 'order-1' }, { idOrder: 'order-2' }];

      orderService.myOrders.mockResolvedValue(mockOrders);

      const result = await controller.myOrders(mockReq);

      expect(orderService.myOrders).toHaveBeenCalledWith('user-123');
      expect(result).toEqual({
        data: mockOrders,
        message: 'Lấy danh sách đơn hàng thành công',
      });
    });
  });

  describe('TimTatCaHoaDon', () => {
    it('nên trả về toàn bộ danh sách hóa đơn từ service', async () => {
      const mockAllOrders = [{ idOrder: 'order-1' }, { idOrder: 'order-2' }];

      orderService.findAll.mockResolvedValue(mockAllOrders);

      const result = await controller.TimTatCaHoaDon();

      expect(orderService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockAllOrders);
    });
  });

  describe('findOne', () => {
    it('nên trả về thông tin chi tiết của một đơn hàng theo id', async () => {
      const idOrder = 'order-1';
      const mockOrder = { idOrder, tongTien: 40000 };

      orderService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(idOrder);

      expect(orderService.findOne).toHaveBeenCalledWith(idOrder);
      expect(result).toEqual({
        data: mockOrder,
        message: 'Lấy thông tin đơn hàng thành công',
      });
    });
  });
});
