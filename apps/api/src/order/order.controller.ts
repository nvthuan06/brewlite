import { Controller, Get, Post, Body, Patch, Param, Delete, Request } from '@nestjs/common';
import { OrderService } from './order.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}
  @Post('checkout')
  async CheckOut (@Request() req:any, @Body() createOrderDto:CreateOrderDto)
  {
    const userId = "du_lieu_mock";
    const newOrder = await this.orderService.CheckOut(userId,createOrderDto);
    return {
      data:newOrder,
      message:"Tạo đơn hàng thành công"
    }

  }
}
