import { Injectable, BadRequestException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { Order } from './entities/order.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { OrderItem } from './entities/orderItem.entity.js';
import { TrangThaiDonHang } from './enum/order.enum.js';
import { PaymentService } from '../payment/payment.service.js';
import { PhuongThucThanhToan } from '../payment/enum/payment.enum.js';
import { PromotionService } from '../promotion/promotion.service.js';

@Injectable()
export class OrderService {
  constructor(
    private readonly ds: DataSource,
    private readonly paymentService: PaymentService,
    private readonly promotionService: PromotionService,
  ) {}

  async CheckOut(userId: string, createOrderDto: CreateOrderDto) {
    const { items, maPromotion } = createOrderDto;
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let tongTien = 0;
      const luuItems = [];

      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, {
          where: { idProduct: Number(item.productId) },
        });
        if (!product) {
          throw new BadRequestException(`Không tìm thấy sản phẩm ID: ${item.productId}`);
        }
        // Ở bước CheckOut chỉ kiểm tra xem kho có đủ hàng không, KHÔNG TRỪ KHO ở đây
        if (product.soLuong < item.soLuong) {
          throw new BadRequestException(`Sản phẩm ${product.tenProduct} không đủ số lượng`);
        }

        const thanhTien = Number(product.giaProduct) * item.soLuong;
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

      const newOrder = queryRunner.manager.create(Order, {
        tongTien: tongTien,
        trangThai: TrangThaiDonHang.DANG_THANH_TOAN,
        promotion: ma ?? undefined,
        orderitem: luuItems,
        user: { id: userId },
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
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException('Lỗi hệ thống khi tạo đơn hàng: ' + errorMessage);
    } finally {
      await queryRunner.release();
    }
  }

  async cancelOrder(userid: string, idOrder: string) {
    const queryRunner = await this.ds.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { idOrder: idOrder, user: { id: userid } },
        relations: { orderitem: { product: true } },
      });
      
      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng hoặc bạn không có quyền hủy');
      }
      if ([TrangThaiDonHang.HOAN_TAT, TrangThaiDonHang.HUY].includes(order.trangThai)) {
        throw new BadRequestException('Không thể hủy đơn hàng này.');
      }

      // CHỈ HOÀN KHO KHI TRƯỚC ĐÓ ĐÃ THANH TOÁN (ĐÃ BỊ TRỪ KHO)
      if (order.trangThai !== TrangThaiDonHang.DANG_THANH_TOAN) {
        for (const item of order.orderitem) {
          if (item.product) {
            item.product.soLuong += item.soLuong;
            await queryRunner.manager.save(Product, item.product);
          }
        }
      }

      order.trangThai = TrangThaiDonHang.HUY;
      const donHangBiHuy = await queryRunner.manager.save(Order, order);
      
      await queryRunner.commitTransaction();
      return donHangBiHuy;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException('Lỗi hệ thống khi xóa đơn hàng: ' + errorMessage);
    } finally {
      await queryRunner.release();
    }
  }

  async updateOrderStatus(idOrder: string, idUser: string, trangThaiMoi: TrangThaiDonHang) {
    const queryRunner = await this.ds.createQueryRunner();
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

      if (order.trangThai === TrangThaiDonHang.THAT_BAI || order.trangThai === TrangThaiDonHang.HUY) {
        throw new BadRequestException(`Đơn hàng đang ở trạng thái "${order.trangThai}", không thể đổi`);
      }

      const trangThaiHopLe: Record<TrangThaiDonHang, TrangThaiDonHang[]> = {
        [TrangThaiDonHang.DANG_THANH_TOAN]: [
          TrangThaiDonHang.DA_NHAN,
          TrangThaiDonHang.THAT_BAI,
          TrangThaiDonHang.HUY,
        ],
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
      };

      if (!trangThaiHopLe[order.trangThai].includes(trangThaiMoi)) {
        throw new BadRequestException(`Không thể chuyển trạng thái từ ${order.trangThai} sang ${trangThaiMoi}`);
      }

      // LOGIC: THANH TOÁN THÀNH CÔNG -> TRỪ KHO
      if (order.trangThai === TrangThaiDonHang.DANG_THANH_TOAN && trangThaiMoi === TrangThaiDonHang.DA_NHAN) {
        for (const item of order.orderitem) {
          if (item.product) {
            // Check lại xem hiện tại kho còn đủ không (đề phòng ai đó mua hết trong lúc chờ thanh toán)
            if (item.product.soLuong < item.soLuong) {
              throw new BadRequestException(`Sản phẩm ${item.product.tenProduct} hiện tại đã hết hàng, không thể xử lý đơn`);
            }
            item.product.soLuong -= item.soLuong;
            await queryRunner.manager.save(Product, item.product);
          }
        }
      }

      // LOGIC: HỦY/THẤT BẠI -> HOÀN KHO (CHỈ KHI TRƯỚC ĐÓ ĐÃ QUA BƯỚC ĐANG_THANH_TOAN VÀ BỊ TRỪ KHO)
      if (
        (trangThaiMoi === TrangThaiDonHang.HUY || trangThaiMoi === TrangThaiDonHang.THAT_BAI) &&
        order.trangThai !== TrangThaiDonHang.DANG_THANH_TOAN
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
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException('Lỗi cập nhật trạng thái đơn hàng: ' + errorMessage);
    } finally {
      await queryRunner.release();
    }
  }

  async findAll() {
    return await this.ds.manager.find(Order, {
      relations: { orderitem: true, promotion: true, user: true },
      order: {
        ngayDatHang: 'DESC',
      },
    });
  }

  async findOne(idOrder: string) {
    const order = await this.ds.getRepository(Order).findOne({
      where: { idOrder },
      relations: { orderitem: { product: true }, user: true },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${idOrder}`);
    }
    return order;
  }
}