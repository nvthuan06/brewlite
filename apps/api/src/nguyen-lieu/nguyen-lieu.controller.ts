import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NguyenLieuService } from './nguyen-lieu.service.js';


@Controller('nguyen-lieu')
export class NguyenLieuController {
  constructor(private readonly nguyenLieuService: NguyenLieuService) {}

  @Get()
  async findAll() {
    return await this.nguyenLieuService.findAll(); 
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.nguyenLieuService.findOne(+id);
  }
}
