import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { Order } from './entities/order.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderItem } from './entities/orderItem.entity.js';
import { TrangThaiDonHang } from './enum/order.enum.js';
import { PaymentService } from '../payment/payment.service.js';
import { PhuongThucThanhToan, TrangThaiThanhToan } from '../payment/enum/payment.enum.js';
import { PromotionService } from '../promotion/promotion.service.js';
import { User } from '../users/entities/user.entity.js';
import {Payment} from '../payment/entities/payment.entity.js'
@Injectable()
export class OrderService {
  constructor(
    private readonly ds: DataSource,
    private readonly paymentService: PaymentService,
    private readonly promotionService: PromotionService,
  ) {}

  async CheckOut(userId: string, createOrderDto: CreateOrderDto) {
    const { items, maPromotion } = createOrderDto;
    const queryRunner = this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let tongTien = 0;
      const luuItems: OrderItem[] = [];

      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { idProduct: Number(item.productId) },
        });
        if (!product) {
          throw new BadRequestException('Không thấy sản phẩm này');
        }
        if (product.soLuong < item.soLuong) {
          throw new BadRequestException('Không đủ số lượng');
        }
        const sizeOption = product.sizes?.find((s) => s.code === item.size);
        const phuPhiSize = sizeOption ? Number(sizeOption.extraPrice) : 0;

        const toppingOption = item.topping
          ? product.toppings?.find((t) => t.code === item.topping)
          : null;
        const phuPhiTopping = toppingOption
          ? Number(toppingOption.extraPrice)
          : 0;

        const donGia = Number(product.giaProduct) + phuPhiSize + phuPhiTopping;
        const thanhTien = donGia * item.soLuong;
        tongTien = tongTien + thanhTien;

        const orderItem = queryRunner.manager.create(OrderItem, {
          product: product,
          soLuong: item.soLuong,
          thanhTien: thanhTien,
          size: item.size,
          topping: item.topping,
        });
        luuItems.push(orderItem);
      }

      let ma = null;
      if (maPromotion) {
        ma = await this.promotionService.kiemTraHopLe(maPromotion);
        const discount = Number(ma.giamGia);
        tongTien = Math.max(0, tongTien - discount);
      }

      const user = await queryRunner.manager.findOneBy(User, {
        idUser: userId,
      });
      if (!user) throw new BadRequestException('Người dùng không tồn tại');
      const newOrder = queryRunner.manager.create(Order, {
        user,
        tongTien: tongTien,
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        promotion: ma ?? undefined,
        orderitem: luuItems,
      });
      await queryRunner.manager.save(Order, newOrder);

      const paymentInfo = await this.paymentService.CreatePayment(
        queryRunner,
        newOrder,
        tongTien,
        PhuongThucThanhToan.VI,
      );

      await queryRunner.commitTransaction();
      return {
        order: newOrder,
        detail: paymentInfo,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi tạo đơn hàng: ' + error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async cancelOrder(userid: string, idOrder: string) {
    const queryRunner = this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { idOrder: idOrder },
        relations: { orderitem: { product: true } },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      const trangThaiChoPhepHuy = [
        TrangThaiDonHang.DANG_THANH_TOAN,
        TrangThaiDonHang.DA_NHAN,
        TrangThaiDonHang.THAT_BAI,
      ];
      if (!trangThaiChoPhepHuy.includes(order.trangThai)) {
        throw new BadRequestException('Không thể hủy đơn hàng này.');
      }

      if (order.trangThai === TrangThaiDonHang.DA_NHAN && order.orderitem) {
        for (const item of order.orderitem) {
          if (item.product) {
            item.product.soLuong += item.soLuong;
            await queryRunner.manager.save(Product, item.product);
          }
        }
      }

      order.trangThai = TrangThaiDonHang.HUY;
      const donHangBiHuy = await queryRunner.manager.save(Order, order);
      const payment = await queryRunner.manager.findOne(Payment, {
        where: { order: { idOrder: idOrder } },
      });
      if (payment) {
        payment.trangThai = TrangThaiThanhToan.FAIL_PAYMENT;
        await queryRunner.manager.save(Payment, payment);
      }
      await queryRunner.commitTransaction();
      return donHangBiHuy;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Lỗi hệ thống khi xóa đơn hàng: ' + error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async updateOrderStatus(
    idOrder: string,
    idUser: string,
    trangThaiMoi: TrangThaiDonHang,
  ) {
    const queryRunner = this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { idOrder: idOrder },
        relations: { orderitem: { product: true } },
      });
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      if (
        order.trangThai === TrangThaiDonHang.HOAN_TAT ||
        order.trangThai === TrangThaiDonHang.HUY
      ) {
        throw new BadRequestException(
          `Đơn hàng đang ở trạng thái "${order.trangThai}", không thể đổi`,
        );
      }

      const trangThaiHopLe: Record<TrangThaiDonHang, TrangThaiDonHang[]> = {
        [TrangThaiDonHang.DA_NHAN]: [
          TrangThaiDonHang.DANG_CHUAN_BI,
          TrangThaiDonHang.HUY,
          TrangThaiDonHang.THAT_BAI,
        ],
        [TrangThaiDonHang.DANG_CHUAN_BI]: [
          TrangThaiDonHang.HOAN_TAT,
          TrangThaiDonHang.HUY,
        ],
        [TrangThaiDonHang.THAT_BAI]: [TrangThaiDonHang.HUY],
        [TrangThaiDonHang.HOAN_TAT]: [],
        [TrangThaiDonHang.HUY]: [],
        [TrangThaiDonHang.DANG_THANH_TOAN]: [
          TrangThaiDonHang.DA_NHAN,
          TrangThaiDonHang.HUY,
          TrangThaiDonHang.THAT_BAI,
        ],
      };

      if (!trangThaiHopLe[order.trangThai].includes(trangThaiMoi)) {
        throw new BadRequestException(
          `Không thể chuyển trạng thái từ ${order.trangThai} sang ${trangThaiMoi}`,
        );
      }

      const daTruKho = [
        TrangThaiDonHang.DA_NHAN,
        TrangThaiDonHang.DANG_CHUAN_BI,
      ].includes(order.trangThai);

      if (
        daTruKho &&
        (trangThaiMoi === TrangThaiDonHang.HUY ||
          trangThaiMoi === TrangThaiDonHang.THAT_BAI) &&
        order.orderitem
      ) {
        for (const item of order.orderitem) {
          if (item.product) {
            item.product.soLuong += item.soLuong;
            await queryRunner.manager.save(Product, item.product);
          }
        }
      }

      order.trangThai = trangThaiMoi;
      const donHangCapNhat = await queryRunner.manager.save(Order, order);
      await queryRunner.commitTransaction();
      return donHangCapNhat;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Lỗi cập nhật trạng thái đơn hàng: ' + error,
      );
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.ds.manager.find(Order, {
      relations: { orderitem: { product: true }, promotion: true },
      order: {
        ngayDatHang: 'DESC',
      },
    });
  }

  async findOne(idOrder: string) {
    const order = await this.ds.getRepository(Order).findOne({
      where: { idOrder },
      relations: { orderitem: { product: true }, promotion: true },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${idOrder}`);
    }
    return order;
  }

  async myOrders(userId: string) {
    return await this.ds.getRepository(Order).createQueryBuilder('order')
      .leftJoinAndSelect('order.orderitem', 'orderitem')
      .leftJoinAndSelect('orderitem.product', 'product')
      .leftJoinAndSelect('order.promotion', 'promotion')
      .leftJoinAndMapOne(
        'order.payment', 
        Payment, 
        'payment', 
        '"payment"."orderId" = "order"."idOrder"'
      )
      .where('"order"."idUser" = :userId', { userId })
      .orderBy('"order"."ngayDatHang"', 'DESC')
      .getMany();
    }
}
