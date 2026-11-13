import { Product } from './product';
import { Promotion } from './promotion';
import { ProductSizeOption, ProductToppingOption } from './product.js';

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
  size: ProductSizeOption;
  topping?: ProductToppingOption;
}

export interface CreateOrderPayload {
  idempotencyKey?: string;
  maPromotion?: string;
  items: OrderItemPayload[];
}

export interface OrderItem {
  id: string;
  soLuong: number;
  thanhTien: number;
  size: ProductSizeOption;
  topping?: ProductToppingOption;
  product?: Product;
}

export interface Order {
  idOrder: string;
  tongTien: number;
  ngayDatHang: string;
  trangThai: TrangThaiDonHang;
  promotion?: Promotion | null;
  orderitem: OrderItem[];
}