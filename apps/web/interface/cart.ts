import { ProductSizeOption, ProductToppingOption } from './product';

export interface CartItem {
  cartItemId: string;
  idProduct: number;
  tenProduct: string;
  urlAnh: string;
  giaProduct: number;
  soLuong: number;
  size: ProductSizeOption;
  topping?: ProductToppingOption | null;
}