import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { TrangThaiDonHang } from './enum/order.enum.js';

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
    it('API-08:nên tạo đơn hàng mới và trả về thông báo thành công', async () => {
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
    it('API-09:nên cập nhật trạng thái đơn hàng với req.user.id', async () => {
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

    it('API-10:nên dùng fallback staff_mock_id nếu req.user không có id hoặc sub', async () => {
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
    it('API-11:nên hủy đơn hàng với req.user.id', async () => {
      const idOrder = 'order-1';
      const mockReq = { user: { id: 'user-123' } } as any;
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

    it('API-12:nên dùng req.user.userId để hủy đơn hàng', async () => {
      const idOrder = 'order-1';
      const mockReq = { user: { userId: 'user-456' } } as any;
      const mockCancelled = { idOrder, trangThai: TrangThaiDonHang.HUY };

      orderService.cancelOrder.mockResolvedValue(mockCancelled);

      const result = await controller.cancelOrder(mockReq, idOrder);

      expect(orderService.cancelOrder).toHaveBeenCalledWith(
        'user-456',
        idOrder,
      );
      expect(result).toEqual({
        data: mockCancelled,
        message: 'Hủy đơn hàng thành công',
      });
    });
  });

  describe('myOrders', () => {
    it('API-13:nên trả về danh sách đơn hàng của người dùng hiện tại', async () => {
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
    it('API-14:nên trả về toàn bộ danh sách hóa đơn từ service', async () => {
      const mockAllOrders = [{ idOrder: 'order-1' }, { idOrder: 'order-2' }];

      orderService.findAll.mockResolvedValue(mockAllOrders);

      const result = await controller.TimTatCaHoaDon();

      expect(orderService.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockAllOrders);
    });
  });

  describe('findOne', () => {
    it('API-15:nên trả về thông tin chi tiết của một đơn hàng theo id và userId', async () => {
      const idOrder = 'order-1';
      const mockReq = {
        user: { userId: 'user-123', email: 'test@brewlite.com' },
      } as any;
      const mockOrder = { idOrder, tongTien: 40000 };

      orderService.findOne.mockResolvedValue(mockOrder);

      const result = await controller.findOne(mockReq, idOrder);

      expect(orderService.findOne).toHaveBeenCalledWith(idOrder, 'user-123');
      expect(result).toEqual({
        data: mockOrder,
        message: 'Lấy thông tin đơn hàng thành công',
      });
    });
  });

  describe('Kiểm tra Auth Guards (X-12, X-13, X-14, X-15)', () => {
    it('X-13, X-14, X-15: findOne, TimTatCaHoaDon và cancelOrder đều được bảo vệ bởi JwtAuthGuard', () => {
      const findOneGuards = Reflect.getMetadata(
        '__guards__',
        OrderController.prototype.findOne,
      );
      const timTatCaGuards = Reflect.getMetadata(
        '__guards__',
        OrderController.prototype.TimTatCaHoaDon,
      );
      const cancelGuards = Reflect.getMetadata(
        '__guards__',
        OrderController.prototype.cancelOrder,
      );

      expect(findOneGuards).toBeDefined();
      expect(findOneGuards[0].name).toBe('JwtAuthGuard');

      expect(timTatCaGuards).toBeDefined();
      expect(timTatCaGuards[0].name).toBe('JwtAuthGuard');

      expect(cancelGuards).toBeDefined();
      expect(cancelGuards[0].name).toBe('JwtAuthGuard');
    });
  });
});
