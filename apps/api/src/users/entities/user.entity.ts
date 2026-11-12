import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Order } from '../../order/entities/order.entity.js';


@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ name: 'passwordHash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'int', default: 0 })
  loyaltyPoints!: number;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];


}