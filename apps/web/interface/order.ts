import { Promotion } from './promotion';
import { ProductSizeOption, ProductToppingOption, Product } from './product.js';
import type { Payment } from './payment';

export type TrangThaiDonHang =
  | 'DANG_THANH_TOAN'
  | 'DA_NHAN'
  | 'DANG_CHUAN_BI'
  | 'HOAN_TAT'
  | 'HUY'
  | 'THAT_BAI';

export interface OrderItemPayload {
  productId: number;
  soLuong: number;
  size: ProductSizeOption['code'];
  topping?: ProductToppingOption['code'];
}

export interface CreateOrderPayload {
  //idempotencyKey?: string;
  maPromotion?: string;
  items: OrderItemPayload[];
}

export interface OrderItem {
  id: string;
  soLuong: number;
  thanhTien: number;
  size: ProductSizeOption['code'];
  topping?: ProductToppingOption['code'];
  product?: Product;
}

export interface Order {
  idOrder: string;
  tongTien: number;
  ngayDatHang: string;
  trangThai: TrangThaiDonHang;
  promotion?: Promotion | null;
  payment?: Payment | null;
  orderitem: OrderItem[];
}
