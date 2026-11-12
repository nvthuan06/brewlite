import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from './order.controller.js';
import { OrderService } from './order.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('OrderController', () => {
  let controller: OrderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: {
            CheckOut: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});