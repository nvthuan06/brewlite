export interface ProductSizeOption {
  code: 'S' | 'M' | 'XL';
  label: string;
  extraPrice: number;
}

export interface ProductToppingOption {
  code: 'tran_chau' | 'kem' | 'pho_mai';
  label: string;
  extraPrice: number;
}

export interface Product {
  idProduct: number;
  tenProduct: string;
  giaProduct: number;
  soLuong: number;
  trangThaiBan: boolean;
  urlAnh: string;
  sizes?: ProductSizeOption[];
  toppings?: ProductToppingOption[];
}