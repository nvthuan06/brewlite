import { Controller, Get, Post, Body, Patch, Param, Delete, Request, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';


@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @UseGuards(JwtAuthGuard)
  @Post('checkout')
  async CheckOut (@Request() req:any, @Body() createOrderDto:CreateOrderDto)
  {
    const userId = await req.user.userId;
    const newOrder = await this.orderService.CheckOut(userId,createOrderDto);
    return {
      data:newOrder,
      message:"Tạo đơn hàng thành công"
    }

  }
  @Get()
  async TimTatCaHoaDon(){
    return await this.orderService.findAll()
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
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  async cancelOrder(@Request() req: any, @Param('id') idOrder: string) {
    const userId = req.user.userId || 'du_lieu_mock';
    const cancelled = await this.orderService.cancelOrder(userId, idOrder);
    return {
      data: cancelled,
      message: 'Hủy đơn hàng thành công',
    };
  }
}
