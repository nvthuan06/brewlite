import { Test, TestingModule } from '@nestjs/testing';
import { PromotionController } from './promotion.controller.js';
import { PromotionService } from './promotion.service.js';
import { vi } from 'vitest';

describe('PromotionController', () => {
  let controller: PromotionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PromotionController],
      providers: [
        {
          provide: PromotionService,
          useValue: {
            // Giả lập các hàm của PromotionService mà Controller có thể gọi
            taoMaMoi: vi.fn(),
            findAll: vi.fn(),
            kiemTraHopLe: vi.fn(),
            apDungMa: vi.fn(),
            goMaGiamGia: vi.fn(),
            toggleStatus: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PromotionController>(PromotionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});