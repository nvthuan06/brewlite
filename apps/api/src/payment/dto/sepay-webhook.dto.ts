export class SePayWebhookDto {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount: string | null;
  amountIn: number;
  amountOut: number;
  accumulated: number;
  code: string | null;
  transactionContent: string;
  referenceCode: string | null;
  body: string | null;
  feeAmount: number;
  description: string;
  transferType: string;
}