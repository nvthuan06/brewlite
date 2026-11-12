import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { Order } from '../../order/entities/order.entity.js';
import {TrangThaiThanhToan, PhuongThucThanhToan} from '../enum/payment.enum.js'

@Entity('payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  idPayment: string;

  @Column({type: 'decimal', precision: 10, scale: 0 })
  soTien: number;

  @Column({type: 'timestamp with time zone', nullable: true })
  ngayThanhToan: Date;

  @Column({ type: 'enum', enum: PhuongThucThanhToan})
  phuongThuc: PhuongThucThanhToan;

  @Column({ type: 'enum', enum: TrangThaiThanhToan})
  trangThai: TrangThaiThanhToan;

  @Column({ type: 'int', unique: true, nullable: true })
  IdempotencyKey: number;

  @OneToOne(()=>Order)
  @JoinColumn({name:'orderId'})
  order:Order;

}
