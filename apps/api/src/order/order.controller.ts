import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  async CheckOut(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user?.id || 'du_lieu_mock';
    const newOrder = await this.orderService.CheckOut(userId, createOrderDto);
    return {
      data: newOrder,
      message: 'Tạo đơn hàng thành công',
    };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') idOrder: string, @Request() req: any, @Body() updateDto: UpdateOrderStatusDto) {
    const idUser = req.user?.id || req.user?.sub || 'staff_mock_id';
    const updated = await this.orderService.updateOrderStatus(
      idOrder,
      idUser,
      updateDto.trangThai,
    );
    return {
      data: updated,
      message: `Đã cập nhật trạng thái đơn hàng sang ${updateDto.trangThai}`,
    };
  }

  // 3. Khách hàng hủy đơn hàng
  @Patch(':id/cancel')
  async cancelOrder(@Request() req: any, @Param('id') idOrder: string) {
    const userId = req.user?.id || 'du_lieu_mock';
    const cancelled = await this.orderService.cancelOrder(userId, idOrder);
    return {
      data: cancelled,
      message: 'Hủy đơn hàng thành công',
    };
  }

  // 4. Lấy danh sách đơn hàng
  @Get()
  async findAll() {
    return await this.orderService.findAll();
  }

  // 5. Xem chi tiết 1 đơn hàng
  @Get(':id')
  async findOne(@Param('id') idOrder: string) {
    return await this.orderService.findOne(idOrder);
  }
}
