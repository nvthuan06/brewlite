import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PromotionService } from './promotion.service.js';
import { CreatePromotionDto } from './dto/CreatePromotion.dto.js';

@Controller('promotion')
export class PromotionController {
  constructor(private readonly promotionService: PromotionService) {}
  @Post()
  async TaoMa(@Body() createdto:CreatePromotionDto){
    return await this.promotionService.taoMaMoi(createdto)
  }

  @Get()
  findAll() {
    return this.promotionService.findAll();
  }

  @Get('validate/:maPromotion')
  KiemTra(@Param('maPromotion') maPromotion: string) {
    return this.promotionService.kiemTraHopLe(maPromotion);
  }

  @Patch(':id/toggle')
  TrangThai(@Param('id') id: string) {
    return this.promotionService.toggleStatus(id);
  }
}
