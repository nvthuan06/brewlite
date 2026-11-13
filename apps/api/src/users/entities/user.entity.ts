import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Order } from '../../order/entities/order.entity.js';
import { LoyaltyTransaction } from './loyalty-transaction.entity.js';
import type { Relation } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  idUser!: string;

  @Column({ type: 'varchar', length: 100 })
  tenUser!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'passwordHash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  // Mọi tài khoản đăng ký công khai đều là KHACH_HANG; không nhận vai trò từ client.
  @Column({ type: 'varchar', length: 30, default: 'KHACH_HANG' })
  vaiTro!: string;

  @Column({ type: 'int', default: 0 })
  diemThuong!: number;

  @OneToMany(() => Order, (order) => order.user)
  orders!: Order[];

  @OneToMany(
    () => LoyaltyTransaction,
    (transaction) => transaction.user,
  )
  loyaltyTransactions!: Relation<LoyaltyTransaction[]>;
}
