import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { OrderItem } from '../../order/entities/orderItem.entity.js';
import { SIZE, TOPPING } from '../../order/enum/orderitem.enum.js';

export interface ProductSizeOption {
  code: SIZE;
  label: string;
  extraPrice: number;
}

export interface ProductToppingOption {
  code: TOPPING;
  label: string;
  extraPrice: number;
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  idProduct: number;

  @Column({ type: 'varchar', length: 255 })
  tenProduct: string;

  @Column({ type: 'decimal', precision: 10, scale: 0 })
  giaProduct: number;

  @Column()
  soLuong: number;

  @Column()
  trangThaiBan: boolean;

  @Column({ type: 'varchar' })
  urlAnh: string;

  @Column({ type: 'jsonb', nullable: true })
  sizes: ProductSizeOption[];

  @Column({ type: 'jsonb', nullable: true })
  toppings: ProductToppingOption[];

  @OneToMany(() => OrderItem, (orderitem) => orderitem.product)
  orderitem: OrderItem[];
}
