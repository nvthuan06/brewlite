import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  // FR-04: tìm email đã được đăng ký hay chưa.
  findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // FR-05: bắt buộc lấy hash để bcrypt.compare().
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      
      select: {
        idUser: true,
        tenUser: true,
        email: true,
        passwordHash: true,
        vaiTro: true,
        diemThuong: true,
      },

    });
  }

  // FR-04: lưu user, không bao giờ nhận mật khẩu thô ở đây.
  async create(tenUser: string, email: string, passwordHash: string): Promise<User> {
    const user = this.usersRepository.create({ tenUser, email, passwordHash, vaiTro: 'KHACH_HANG', diemThuong: 0 });
    return this.usersRepository.save(user);
  }
}