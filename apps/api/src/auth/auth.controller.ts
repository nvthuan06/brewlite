import { Body, Controller, Get, Post, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

type AuthenticatedRequest = Request & { user: { userId: string; email: string } };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

 
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  // Chỉ phục vụ chứng minh JWT guard; KHÔNG phải nhánh FR-05 chính.
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@Req() req: AuthenticatedRequest) {
    return { userId: req.user.userId, email: req.user.email };
  }
}