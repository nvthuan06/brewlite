import { Controller, Get, Post, Body, Patch, Param, Delete, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service.js';
import { SePayWebhookDto } from './dto/sepay-webhook.dto.js'
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}
  
  @Post('webhook-sepay')
  async SepayWebhook(
    @Body() payload:any,
    @Headers('Authorization') authHeader: string,
  ) {
    console.log("PAYLOAD TỪ SEPAY:", payload);
    return this.paymentService.handWeHook(payload);
  }
}
