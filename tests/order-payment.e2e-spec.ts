import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Logger } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../apps/api/src/app.module';
import { DataSource } from 'typeorm';
import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import { Product } from '../apps/api/src/products/entities/product.entity';
import { User } from '../apps/api/src/users/entities/user.entity';
import { Order } from '../apps/api/src/order/entities/order.entity';
import { Payment } from '../apps/api/src/payment/entities/payment.entity';
import { TrangThaiDonHang } from '../apps/api/src/order/enum/order.enum';
import { TrangThaiThanhToan } from '../apps/api/src/payment/enum/payment.enum';
import { getConnectionToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

describe('Luồng từ tạo đơn đến thanh toán', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let testUser: User;
  let testProduct: Product;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // Dùng Logger chuẩn của NestJS để bắt buộc in ra chi tiết mọi lỗi 500 (stack trace)
    app.useLogger(new Logger());

    await app.init();

    dataSource = app.get<DataSource>(getConnectionToken());
  });

  beforeEach(async () => {
    // 1. Làm sạch và tạo lại toàn bộ bảng
    await dataSource.synchronize(true);

    // 2. Seed dữ liệu User
    testUser = await dataSource.getRepository(User).save({
      idUser: '123e4567-e89b-12d3-a456-426614174000',
      tenUser: 'Test',
      email: 'test@brewlite.com',
      passwordHash: 'hashed-password',
      vaiTro: 'KHACH_HANG',
      diemThuong: 0,
    });

    // 3. Seed dữ liệu Product
    testProduct = await dataSource.getRepository(Product).save({
      idProduct: 1,
      tenProduct: 'Cà phê sữa đá',
      giaProduct: 20000,
      soLuong: 50,
      urlAnh: 'https://example.com/coffee.jpg',
      trangThaiBan: true,
    });

    // 4. Tạo JWT Token bao phủ mọi tên biến ID mà JwtStrategy có thể dùng
    const jwtService = app.get(JwtService);
    jwtToken = jwtService.sign({
      sub: testUser.idUser,
      idUser: testUser.idUser,
      userId: testUser.idUser,
      id: testUser.idUser,
      email: testUser.email,
      vaiTro: testUser.vaiTro,
      role: testUser.vaiTro,
    });
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    if (app) {
      await app.close();
    }
  });

it('Đặt đơn thành công và webhook của Sepay trả về', async () => {
    const checkoutRes = await request(app.getHttpServer())
      .post('/order/checkout')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({
        items: [{ productId: testProduct.idProduct, soLuong: 2, size: 'M' }],
      });

    expect(checkoutRes.status).toBe(201);

    const orderData = checkoutRes.body.data.order;
    const paymentData = checkoutRes.body.data.detail.payment;

    expect(Number(orderData.tongTien)).toBe(40000);
    expect(orderData.trangThai).toBe(TrangThaiDonHang.DANG_THANH_TOAN);

    const maChuyenKhoan = paymentData.maChuyenKhoan;
    expect(maChuyenKhoan).toBeDefined();

    const sepayPayload = {
      id: Math.floor(Math.random() * 10000),
      gateway: 'MBBank',
      transactionDate: '2026-11-15 08:00:00',
      content: maChuyenKhoan,
      transferType: 'in',
      transferAmount: 40000,
    };

    const webhookRes = await request(app.getHttpServer())
      .post('/payment/webhook-sepay')
      .send(sepayPayload);

    // Xác nhận Webhook phản hồi mã HTTP thành công (200 hoặc 201)
    expect([200, 201]).toContain(webhookRes.status);

    // Kiểm tra trạng thái thực tế trong Database sau khi Webhook chạy xong
    const orderInDb = await dataSource.getRepository(Order).findOne({
      where: { idOrder: orderData.idOrder },
    });
    const paymentInDb = await dataSource.getRepository(Payment).findOne({
      where: { order: { idOrder: orderData.idOrder } },
    });
    const productInDb = await dataSource.getRepository(Product).findOne({
      where: { idProduct: testProduct.idProduct },
    });

    expect(orderInDb?.trangThai).toBe(TrangThaiDonHang.DA_NHAN);
    expect(paymentInDb?.trangThai).toBe(TrangThaiThanhToan.SUCCESS_PAYMENT);
    expect(productInDb?.soLuong).toBe(48);
  });
});