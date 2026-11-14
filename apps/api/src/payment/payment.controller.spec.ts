import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PaymentController', () => {
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: {
            handleWebhook: vi.fn(),
            CreatePayment: vi.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('Payment controller', () => {
    expect(controller).toBeDefined();
  });
});