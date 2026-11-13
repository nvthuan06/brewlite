
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';

import type { UsersService } from '../users/users.service.js';
import type { JwtService } from '@nestjs/jwt';

vi.mock('bcrypt', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService (FR-04, FR-05)', () => {
  const users = {
    findByEmail: vi.fn(),
    findByEmailWithPassword: vi.fn(),
    create: vi.fn(),
  };

  const jwt = {
    signAsync: vi.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    vi.resetAllMocks();

    service = new AuthService(
      users as unknown as UsersService,
      jwt as unknown as JwtService,
    );
  });

  describe('FR-04: Đăng ký', () => {
    it('TC01: Đăng ký hợp lệ, mã hóa mật khẩu', async () => {
      users.findByEmail.mockResolvedValue(null);

      vi.mocked(bcrypt.hash).mockResolvedValue(
        'hashed-password' as never,
      );

      users.create.mockResolvedValue({
        id: 7,
        email: 'test@brewlite.com',
      });

      const result = await service.register({
        email: ' Test@BrewLite.com ',
        password: 'Abc123456',
      });

      expect(users.findByEmail).toHaveBeenCalledWith(
        'test@brewlite.com',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith(
        'Abc123456',
        12,
      );

      expect(users.create).toHaveBeenCalledWith(
        'test@brewlite.com',
        'hashed-password',
      );

      expect(result.user).toEqual({
        id: 7,
        email: 'test@brewlite.com',
      });

      expect(JSON.stringify(result)).not.toContain(
        'hashed-password',
      );
    });

    it('TC02: Email trùng trả lỗi 409', async () => {
      users.findByEmail.mockResolvedValue({
        id: 1,
        email: 'used@brewlite.com',
      });

      await expect(
        service.register({
          email: 'used@brewlite.com',
          password: 'Abc123456',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(users.create).not.toHaveBeenCalled();
    });

    it('TC03: PostgreSQL unique 23505 trả lỗi 409', async () => {
      users.findByEmail.mockResolvedValue(null);

      vi.mocked(bcrypt.hash).mockResolvedValue(
        'hashed-password' as never,
      );

      users.create.mockRejectedValue({
        driverError: { code: '23505' },
      });

      await expect(
        service.register({
          email: 'race@brewlite.com',
          password: 'Abc123456',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('TC04: Không che giấu lỗi database', async () => {
      users.findByEmail.mockResolvedValue(null);

      vi.mocked(bcrypt.hash).mockResolvedValue(
        'hashed-password' as never,
      );

      users.create.mockRejectedValue(
        new Error('database unavailable'),
      );

      await expect(
        service.register({
          email: 'test@brewlite.com',
          password: 'Abc123456',
        }),
      ).rejects.toThrow('database unavailable');
    });
  });

  describe('FR-05: Đăng nhập', () => {
    it('TC05: Đăng nhập thành công và cấp JWT', async () => {
      users.findByEmailWithPassword.mockResolvedValue({
        id: 8,
        email: 'test@brewlite.com',
        passwordHash: 'stored-hash',
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(
        true as never,
      );

      jwt.signAsync.mockResolvedValue('signed.jwt.token');

      const result = await service.login({
        email: ' TEST@brewlite.com ',
        password: 'Abc123456',
      });

      expect(
        users.findByEmailWithPassword,
      ).toHaveBeenCalledWith('test@brewlite.com');

      expect(bcrypt.compare).toHaveBeenCalledWith(
        'Abc123456',
        'stored-hash',
      );

      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: 8,
        email: 'test@brewlite.com',
      });

      expect(result).toMatchObject({
        access_token: 'signed.jwt.token',
        token_type: 'Bearer',
      });
    });

    it('TC06: Email không tồn tại trả lỗi 401', async () => {
      users.findByEmailWithPassword.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'missing@brewlite.com',
          password: 'Abc123456',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('TC07: Sai mật khẩu trả lỗi 401', async () => {
      users.findByEmailWithPassword.mockResolvedValue({
        id: 8,
        email: 'test@brewlite.com',
        passwordHash: 'stored-hash',
      });

      vi.mocked(bcrypt.compare).mockResolvedValue(
        false as never,
      );

      await expect(
        service.login({
          email: 'test@brewlite.com',
          password: 'Wrong12345',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(jwt.signAsync).not.toHaveBeenCalled();
    });

    it('TC08: Thiếu passwordHash trả lỗi 401', async () => {
      users.findByEmailWithPassword.mockResolvedValue({
        id: 8,
        email: 'test@brewlite.com',
      });

      await expect(
        service.login({
          email: 'test@brewlite.com',
          password: 'Abc123456',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});