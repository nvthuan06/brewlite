import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('PaymentController', () => {
  let controller: PaymentController;
  let paymentService: {
    handWeHook: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    paymentService = {
      handWeHook: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        {
          provide: PaymentService,
          useValue: paymentService,
        },
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

  it('Payment controller nên được khởi tạo', () => {
    expect(controller).toBeDefined();
  });

  describe('SepayWebhook (POST /payment/webhook-sepay)', () => {
    it('API-16: nên nhận payload từ SePay webhook và gọi service.handWeHook', async () => {
      const mockPayload = {
        id: 12345,
        gateway: 'sepay',
        transactionDate: '2026-10-26 12:00:00',
        accountNumber: '123456789',
        content: 'BREWLITE DH01',
        transferType: 'in',
        transferAmount: 50000,
      };
      const mockAuthHeader = 'Apikey test-token-123';
      const mockResult = { success: true, message: 'Webhook processed' };

      // Giả lập service xử lý thành công
      paymentService.handWeHook.mockResolvedValue(mockResult);

      const result = await controller.SepayWebhook(mockPayload, mockAuthHeader);

      // Kiểm tra controller có truyền đúng payload xuống service không
      expect(paymentService.handWeHook).toHaveBeenCalledWith(mockPayload);
      // Kiểm tra kết quả trả về
      expect(result).toEqual(mockResult);
    });
  });
});