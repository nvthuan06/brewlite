import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Order } from '../../order/entities/order.entity.js';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  idPromotion: string;

  @Column({ unique: true })
  maPromotion: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  giamGia: number;

  @Column({ type: 'timestamp' })
  hanPromotion: Date;

  @Column({ default: true })
  trangThaiHoatDong: boolean;

  @OneToMany(() => Order, (order) => order.promotion)
  orders: Order[];
}
