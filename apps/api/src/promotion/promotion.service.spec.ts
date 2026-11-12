import { Test, TestingModule } from '@nestjs/testing';
import { PromotionService } from './promotion.service.js';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity.js';
import { Order } from '../order/entities/order.entity.js';
import { vi } from 'vitest';

describe('PromotionService', () => {
  let service: PromotionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromotionService,
        {
          provide: getRepositoryToken(Promotion),
          useValue: {
            findOne: vi.fn(),
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
          },
        },
        {
          provide: getRepositoryToken(Order),
          useValue: {
            findOne: vi.fn(),
            save: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PromotionService>(PromotionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});