import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.usersService.findByEmail(email);
    if (existing) throw new ConflictException('Email đã được sử dụng');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.usersService.create(dto.tenUser.trim(), email, passwordHash);
      return { message: 'Đăng ký thành công', user: { idUser: user.idUser, tenUser: user.tenUser, email: user.email, vaiTro: user.vaiTro, diemThuong: user.diemThuong } };
    } catch (error: unknown) {
      // PostgreSQL UNIQUE VIOLATION (hai lượt đăng ký đồng thời).
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Email đã được sử dụng');
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmailWithPassword(email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = { sub: user.idUser, email: user.email };
    const access_token = await this.jwtService.signAsync(payload);
    return { access_token, token_type: 'Bearer' };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { code?: string; driverError?: { code?: string } };
    return candidate.code === '23505' || candidate.driverError?.code === '23505';
  }
}