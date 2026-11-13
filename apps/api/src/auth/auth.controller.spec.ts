
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';

describe('AuthController', () => {
  const auth = {
    register: vi.fn(),
    login: vi.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    vi.resetAllMocks();

    controller = new AuthController(
      auth as unknown as AuthService,
    );
  });

  it('TC09: Chuyển dữ liệu đăng ký cho AuthService', async () => {
    const dto = {
      tenUser: 'Test User',
      email: 'test@brewlite.com',
      password: 'Abc123456',
    };

    const response = {
      message: 'Đăng ký thành công',
      user: {
        id: 1,
        email: dto.email,
      },
    };

    auth.register.mockResolvedValue(response);

    await expect(
      controller.register(dto),
    ).resolves.toEqual(response);

    expect(auth.register).toHaveBeenCalledWith(dto);
  });

  it('TC10: Chuyển dữ liệu đăng nhập cho AuthService', async () => {
    const dto = {
      email: 'test@brewlite.com',
      password: 'Abc123456',
    };

    auth.login.mockResolvedValue({
      access_token: 'jwt',
      token_type: 'Bearer',
    });

    await expect(
      controller.login(dto),
    ).resolves.toEqual({
      access_token: 'jwt',
      token_type: 'Bearer',
    });

    expect(auth.login).toHaveBeenCalledWith(dto);
  });

  it('TC11: Profile trả thông tin người dùng', () => {
    const req = {
      user: {
        userId: 'uuid-5',
        email: 'test@brewlite.com',
      },
    };

    const result = controller.profile(
      req as Parameters<AuthController['profile']>[0],
    );

    expect(result).toEqual({
      userId: 'uuid-5',
      email: 'test@brewlite.com',
    });
  });
});