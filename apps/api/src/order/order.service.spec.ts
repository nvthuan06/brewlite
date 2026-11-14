import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { OrderService } from './order.service.js';
import { PaymentService } from '../payment/payment.service.js';
import {
  TrangThaiThanhToan,
} from '../payment/enum/payment.enum.js';
import { PromotionService } from '../promotion/promotion.service.js';
import { User } from '../users/entities/user.entity.js';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/orderItem.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Payment } from '../payment/entities/payment.entity.js';
import { TrangThaiDonHang } from './enum/order.enum.js';
import { PhuongThucThanhToan } from '../payment/enum/payment.enum.js';

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
      manager: { find: vi.fn() },
      getRepository: vi.fn(),
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
    // Phải có sản phẩm hợp lệ để chạy đến nhánh kiểm tra user.
    queryRunnerMock.manager.findOne.mockResolvedValue({
      idProduct: 1, soLuong: 10, giaProduct: 50000,
    });
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
    ).rejects.toThrow('Người dùng không tồn tại');

    expect(queryRunnerMock.manager.findOneBy).toHaveBeenCalledWith(User, { idUser: userId });
    expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
    expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunnerMock.release).toHaveBeenCalled();
    expect(paymentServiceMock.CreatePayment).not.toHaveBeenCalled();
  });


  describe('CheckOut - nhánh nghiệp vụ bổ sung', () => {
    const makeDto = (options: Record<string, unknown> = {}) => ({
      items: [{ productId: 1, soLuong: 2, size: 'M', topping: 'tran_chau' }],
      ...options,
    });

    it('báo lỗi sản phẩm không tồn tại và rollback transaction', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(null);

      await expect(service.CheckOut(userId, makeDto() as any))
        .rejects.toThrow('Không thấy sản phẩm này');
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
      expect(paymentServiceMock.CreatePayment).not.toHaveBeenCalled();
    });

    it('tính đúng phụ phí size, topping và tạo OrderItem', async () => {
      const product = {
        idProduct: 1, soLuong: 10, giaProduct: '30000',
        sizes: [{ code: 'M', extraPrice: 5000 }],
        toppings: [{ code: 'tran_chau', extraPrice: 7000 }],
      };
      queryRunnerMock.manager.findOne.mockResolvedValue(product);
      paymentServiceMock.CreatePayment.mockResolvedValue({ id: 'pay' });

      const result = await service.CheckOut(userId, makeDto() as any);
      expect(result.order.tongTien).toBe(84000); // (30000+5000+7000)*2
      expect(queryRunnerMock.manager.create).toHaveBeenCalledWith(OrderItem,
        expect.objectContaining({ product, soLuong: 2, thanhTien: 84000 }));
      expect(paymentServiceMock.CreatePayment).toHaveBeenCalledWith(
        queryRunnerMock, result.order, 84000, PhuongThucThanhToan.VI,
      );
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalledOnce();
    });

    it('tính giá mặc định nếu tùy chọn size và topping không tồn tại', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue({
        idProduct: 1, soLuong: 20, giaProduct: 25000,
        sizes: [], toppings: [],
      });
      paymentServiceMock.CreatePayment.mockResolvedValue({ id: 'pay' });

      const result = await service.CheckOut(userId,
        makeDto({ items: [{ productId: 1, soLuong: 2, size: 'XL' }] }) as any);
      expect(result.order.tongTien).toBe(50000);
      expect(result.order.orderitem[0].thanhTien).toBe(50000);
    });

    it('tổng hợp nhiều sản phẩm, áp dụng khuyến mãi và không để tổng tiền âm', async () => {
      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce({ idProduct: 1, soLuong: 10, giaProduct: 10000 })
        .mockResolvedValueOnce({ idProduct: 2, soLuong: 10, giaProduct: 15000 });
      const promotion = { maPromotion: 'SALE', giamGia: 100000 };
      promotionServiceMock.kiemTraHopLe.mockResolvedValue(promotion);
      paymentServiceMock.CreatePayment.mockResolvedValue({ id: 'pay' });

      const result = await service.CheckOut(userId, makeDto({
        maPromotion: 'SALE',
        items: [
          { productId: 1, soLuong: 1, size: 'S' },
          { productId: 2, soLuong: 2, size: 'S' },
        ],
      }) as any);
      expect(result.order.orderitem).toHaveLength(2);
      expect(result.order.tongTien).toBe(0);
      expect(result.order.promotion).toEqual(promotion);
      expect(promotionServiceMock.kiemTraHopLe).toHaveBeenCalledWith('SALE');
      expect(paymentServiceMock.CreatePayment).toHaveBeenCalledWith(
        queryRunnerMock, result.order, 0, PhuongThucThanhToan.VI,
      );
    });

    it('khuyến mãi không hợp lệ gây rollback và chuyển tiếp NotFoundException', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue({
        idProduct: 1, soLuong: 10, giaProduct: 25000,
      });
      promotionServiceMock.kiemTraHopLe.mockRejectedValue(
        new NotFoundException('Không tìm thấy mã khuyến mãi'),
      );

      await expect(service.CheckOut(userId,
        makeDto({ maPromotion: 'SAI' }) as any,
      )).rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
      expect(paymentServiceMock.CreatePayment).not.toHaveBeenCalled();
    });

    it('lỗi không dự kiến từ hệ thống thanh toán được đóng gói thành lỗi 500', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue({
        idProduct: 1, soLuong: 10, giaProduct: 30000,
      });
      paymentServiceMock.CreatePayment.mockRejectedValue(new Error('payment down'));

      await expect(service.CheckOut(userId, makeDto() as any))
        .rejects.toBeInstanceOf(InternalServerErrorException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
      expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('cancelOrder - hủy đơn và hoàn kho', () => {
    it('trả về 404 khi đơn hàng không tồn tại', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(null);
      await expect(service.cancelOrder(userId, 'missing'))
        .rejects.toThrow('Không tìm thấy đơn hàng');
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
    });

    it('từ chối hủy đơn đã hoàn tất', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue({
        idOrder: 'o1', trangThai: TrangThaiDonHang.HOAN_TAT,
      });
      await expect(service.cancelOrder(userId, 'o1'))
        .rejects.toBeInstanceOf(BadRequestException);
      expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
    });

    it('hủy đơn đang thanh toán, cập nhật Payment và không hoàn kho', async () => {
      const product = { idProduct: 1, soLuong: 5 };
      const order = {
        idOrder: 'o1', trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        orderitem: [{ product, soLuong: 2 }],
      };
      const payment = { trangThai: TrangThaiThanhToan.PENDING };
      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(payment);

      const result = await service.cancelOrder(userId, 'o1');
      expect(result.trangThai).toBe(TrangThaiDonHang.HUY);
      expect(payment.trangThai).toBe(TrangThaiThanhToan.FAIL_PAYMENT);
      expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(Order, order);
      expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(Payment, payment);
      expect(queryRunnerMock.manager.save).not.toHaveBeenCalledWith(Product, product);
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
    });

    it('hủy đơn đã nhận: hoàn kho từng sản phẩm, kể cả mục không liên kết product', async () => {
      const product = { idProduct: 1, soLuong: 3 };
      const order = {
        idOrder: 'o1', trangThai: TrangThaiDonHang.DA_NHAN,
        orderitem: [{ product, soLuong: 4 }, { product: null, soLuong: 2 }],
      };
      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce(order)
        .mockResolvedValueOnce(null);

      const result = await service.cancelOrder(userId, 'o1');
      expect(result.trangThai).toBe(TrangThaiDonHang.HUY);
      expect(product.soLuong).toBe(7);
      expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(Product, product);
      expect(queryRunnerMock.manager.save).not.toHaveBeenCalledWith(Payment, expect.anything());
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalledOnce();
    });

    it('hủy đơn thất bại trước đó: không hoàn kho lần nữa', async () => {
      const product = { idProduct: 1, soLuong: 3 };
      queryRunnerMock.manager.findOne
        .mockResolvedValueOnce({
          idOrder: 'o1', trangThai: TrangThaiDonHang.THAT_BAI,
          orderitem: [{ product, soLuong: 2 }],
        })
        .mockResolvedValueOnce(null);
      const result = await service.cancelOrder(userId, 'o1');
      expect(result.trangThai).toBe(TrangThaiDonHang.HUY);
      expect(product.soLuong).toBe(3);
      expect(queryRunnerMock.manager.save).not.toHaveBeenCalledWith(Product, product);
    });

    it('lỗi database bất ngờ: rollback, release và lỗi 500', async () => {
      queryRunnerMock.manager.findOne.mockRejectedValue(new Error('db unavailable'));
      await expect(service.cancelOrder(userId, 'o1'))
        .rejects.toBeInstanceOf(InternalServerErrorException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
    });
  });

  describe('updateOrderStatus - quy tắc chuyển trạng thái', () => {
    const loadOrder = (trangThai: TrangThaiDonHang, orderitem?: any[]) => {
      const order = { idOrder: 'o1', trangThai, orderitem };
      queryRunnerMock.manager.findOne.mockResolvedValue(order);
      return order;
    };

    it('trả về 404 khi không tồn tại đơn hàng', async () => {
      queryRunnerMock.manager.findOne.mockResolvedValue(null);
      await expect(service.updateOrderStatus('missing', userId, TrangThaiDonHang.DA_NHAN))
        .rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
    });

    it.each([TrangThaiDonHang.HOAN_TAT, TrangThaiDonHang.HUY])(
      'không cho phép đổi trạng thái khi đơn đã %s', async (status) => {
        loadOrder(status);
        await expect(service.updateOrderStatus('o1', userId, TrangThaiDonHang.DA_NHAN))
          .rejects.toBeInstanceOf(BadRequestException);
        expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
        expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
      },
    );

    it('từ chối chuyển trạng thái sai quy trình', async () => {
      loadOrder(TrangThaiDonHang.DANG_THANH_TOAN);
      await expect(service.updateOrderStatus('o1', userId, TrangThaiDonHang.HOAN_TAT))
        .rejects.toThrow('Không thể chuyển trạng thái');
      expect(queryRunnerMock.commitTransaction).not.toHaveBeenCalled();
    });

    it('cho phép chuyển đang thanh toán sang đã nhận mà không hoàn kho', async () => {
      const product = { soLuong: 5 };
      loadOrder(TrangThaiDonHang.DANG_THANH_TOAN, [{ product, soLuong: 2 }]);
      const result = await service.updateOrderStatus('o1', userId, TrangThaiDonHang.DA_NHAN);
      expect(result.trangThai).toBe(TrangThaiDonHang.DA_NHAN);
      expect(product.soLuong).toBe(5);
      expect(queryRunnerMock.manager.save).not.toHaveBeenCalledWith(Product, product);
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalledOnce();
    });

    it('cho phép đã nhận chuyển sang đang chuẩn bị', async () => {
      loadOrder(TrangThaiDonHang.DA_NHAN);
      const result = await service.updateOrderStatus('o1', userId, TrangThaiDonHang.DANG_CHUAN_BI);
      expect(result.trangThai).toBe(TrangThaiDonHang.DANG_CHUAN_BI);
      expect(queryRunnerMock.commitTransaction).toHaveBeenCalledOnce();
    });

    it.each([TrangThaiDonHang.HUY, TrangThaiDonHang.THAT_BAI])(
      'đã nhận chuyển sang %s sẽ hoàn lại tồn kho', async (target) => {
        const product = { idProduct: 1, soLuong: 4 };
        loadOrder(TrangThaiDonHang.DA_NHAN, [
          { product, soLuong: 3 },
          { product: null, soLuong: 5 },
        ]);
        const result = await service.updateOrderStatus('o1', userId, target);
        expect(result.trangThai).toBe(target);
        expect(product.soLuong).toBe(7);
        expect(queryRunnerMock.manager.save).toHaveBeenCalledWith(Product, product);
        expect(queryRunnerMock.commitTransaction).toHaveBeenCalledOnce();
      },
    );

    it('đang chuẩn bị chuyển sang hủy thì hoàn kho', async () => {
      const product = { soLuong: 2 };
      loadOrder(TrangThaiDonHang.DANG_CHUAN_BI, [{ product, soLuong: 3 }]);
      const result = await service.updateOrderStatus('o1', userId, TrangThaiDonHang.HUY);
      expect(result.trangThai).toBe(TrangThaiDonHang.HUY);
      expect(product.soLuong).toBe(5);
    });

    it('đơn thất bại chuyển sang hủy không hoàn kho hai lần', async () => {
      const product = { soLuong: 5 };
      loadOrder(TrangThaiDonHang.THAT_BAI, [{ product, soLuong: 2 }]);
      const result = await service.updateOrderStatus('o1', userId, TrangThaiDonHang.HUY);
      expect(result.trangThai).toBe(TrangThaiDonHang.HUY);
      expect(product.soLuong).toBe(5);
      expect(queryRunnerMock.manager.save).not.toHaveBeenCalledWith(Product, product);
    });

    it('trường hợp lỗi hệ thống: rollback và bọc lỗi 500', async () => {
      queryRunnerMock.manager.findOne.mockRejectedValue(new Error('database down'));
      await expect(service.updateOrderStatus('o1', userId, TrangThaiDonHang.DA_NHAN))
        .rejects.toBeInstanceOf(InternalServerErrorException);
      expect(queryRunnerMock.rollbackTransaction).toHaveBeenCalledOnce();
      expect(queryRunnerMock.release).toHaveBeenCalledOnce();
    });
  });

  describe('findAll / findOne / myOrders', () => {
    it('findAll sắp xếp hóa đơn mới nhất trước', async () => {
      const orders = [{ idOrder: 'o2' }, { idOrder: 'o1' }];
      dataSourceMock.manager.find.mockResolvedValue(orders);
      const result = await service.findAll();
      expect(result).toEqual(orders);
      expect(dataSourceMock.manager.find).toHaveBeenCalledWith(Order, {
        relations: { orderitem: { product: true }, promotion: true },
        order: { ngayDatHang: 'DESC' },
      });
    });

    it('findOne trả về đơn hàng với sản phẩm và khuyến mãi', async () => {
      const order = { idOrder: 'o1' };
      const repository = { findOne: vi.fn().mockResolvedValue(order) };
      dataSourceMock.getRepository.mockReturnValue(repository);
      await expect(service.findOne('o1')).resolves.toBe(order);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { idOrder: 'o1' },
        relations: { orderitem: { product: true }, promotion: true },
      });
    });

    it('findOne trả về 404 khi đơn hàng không tồn tại', async () => {
      dataSourceMock.getRepository.mockReturnValue({
        findOne: vi.fn().mockResolvedValue(null),
      });
      await expect(service.findOne('none')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('myOrders lọc theo user và nối đầy đủ orderitem, product, promotion, payment', async () => {
      const result = [{ idOrder: 'o1' }];
      const qb: any = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        leftJoinAndMapOne: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValue(result),
      };
      const repo = { createQueryBuilder: vi.fn().mockReturnValue(qb) };
      dataSourceMock.getRepository.mockReturnValue(repo);

      await expect(service.myOrders(userId)).resolves.toEqual(result);
      expect(repo.createQueryBuilder).toHaveBeenCalledWith('order');
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(3);
      expect(qb.leftJoinAndMapOne).toHaveBeenCalledWith(
        'order.payment', Payment, 'payment', expect.any(String),
      );
      expect(qb.where).toHaveBeenCalledWith('"order"."idUser" = :userId', { userId });
      expect(qb.orderBy).toHaveBeenCalledWith('"order"."ngayDatHang"', 'DESC');
    });
  });
});
