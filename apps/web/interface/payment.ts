import { Order } from './order';

export type PhuongThucThanhToan = 'VI_DIEN_TU' | 'THE_NGAN_HANG';
export type TrangThaiThanhToan = 'PENDING' | 'FAIL_PAYMENT' | 'SUCCESS_PAYMENT';

export interface Payment {
  idPayment: string;
  soTien: number;
  ngayThanhToan?: string | null;
  phuongThuc: PhuongThucThanhToan;
  trangThai: TrangThaiThanhToan;
  maChuyenKhoan?: string;
  IdempotencyKey?: number | null;
  order?: Order;
}

export interface ChiTietPayment {
  payment: Payment;
  qrCodeUrl: string;
}

export interface CheckoutResponse {
  data: {
    order: Order;
    detail: ChiTietPayment | null;
  };
  message: string;
}