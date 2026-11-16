import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NguyenLieuService } from './nguyen-lieu.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NguyenLieu } from './entities/nguyen-lieu.entity.js';
import { ChiTietNguyenLieu } from './entities/chitietnguyenlieu.entity.js';
import { Product } from '../products/entities/product.entity.js';

describe('NguyenLieuService', () => {
  let service: NguyenLieuService;

  const mockNguyenLieuRepo = {
    find: vi.fn(),
    save: vi.fn(),
  };
  const mockCongThucRepo = {
    find: vi.fn(),
    save: vi.fn(),
    create: vi.fn(),
  };
  const mockProductRepo = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NguyenLieuService,
        {
          provide: getRepositoryToken(NguyenLieu),
          useValue: mockNguyenLieuRepo,
        },
        {
          provide: getRepositoryToken(ChiTietNguyenLieu),
          useValue: mockCongThucRepo,
        },
        {
          provide: getRepositoryToken(Product),
          useValue: mockProductRepo,
        },
      ],
    }).compile();

    service = module.get<NguyenLieuService>(NguyenLieuService);
  });


  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('capNhatSoLuong', () => {
    it('nên trả về 0 nếu sản phẩm không có công thức', async () => {
      mockProductRepo.findOne.mockResolvedValue({
        idProduct: 1,
        chitietnguyenlieu: [], 
      });

      const result = await service.capNhatSoLuong(1);

      expect(result).toBe(0);
      expect(mockProductRepo.findOne).toHaveBeenCalledWith({
        where: { idProduct: 1 },
        relations: { chitietnguyenlieu: { nguyenlieu: true } },
      });
    });
  });
});