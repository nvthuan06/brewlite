
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Repository } from 'typeorm';
import { UsersService } from './users.service.js';
import type { User } from './entities/user.entity.js';

describe('UsersService', () => {
  const repo = {
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
  };

  let service: UsersService;

  beforeEach(() => {
    vi.resetAllMocks();
    service = new UsersService(
      repo as unknown as Repository<User>,
    );
  });

  it('findByEmail: tìm người dùng bằng email', async () => {
    repo.findOne.mockResolvedValue({
      idUser: 'uuid-3',
      email: 'test@brewlite.com',
    });

    const result = await service.findByEmail(
      'test@brewlite.com',
    );

    expect(repo.findOne).toHaveBeenCalledWith({
      where: { email: 'test@brewlite.com' },
    });

    expect(result?.idUser).toBe('uuid-3');
  });

  it('findByEmail: trả null khi chưa đăng ký', async () => {
    repo.findOne.mockResolvedValue(null);

    await expect(
      service.findByEmail('missing@brewlite.com'),
    ).resolves.toBeNull();
  });

  it('findByEmailWithPassword: lấy passwordHash', async () => {
    repo.findOne.mockResolvedValue({
      idUser: 'uuid-3',
      tenUser: 'Test User',
      email: 'test@brewlite.com',
      passwordHash: 'hash',
      vaiTro: 'KHACH_HANG',
      diemThuong: 0,
    });

    await service.findByEmailWithPassword(
      'test@brewlite.com',
    );

    const options = repo.findOne.mock.calls[0][0];

    expect(options.where).toEqual({
      email: 'test@brewlite.com',
    });

    expect(options.select.passwordHash).toBe(true);
  });

  it('create: tạo và lưu tài khoản', async () => {
    const entity = {
      tenUser: 'Test User',
      email: 'test@brewlite.com',
      passwordHash: 'hash',
      vaiTro: 'KHACH_HANG',
      diemThuong: 0,
    };

    repo.create.mockReturnValue(entity);

    repo.save.mockResolvedValue({
      idUser: 'uuid-3',
      ...entity,
    });

    const result = await service.create(
      'Test User',
      'test@brewlite.com',
      'hash',
    );

    expect(repo.create).toHaveBeenCalledWith(entity);
    expect(repo.save).toHaveBeenCalledWith(entity);
    expect(result.idUser).toBe('uuid-3');
  });
});
