import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity.js';
import type { Relation } from 'typeorm';

export enum LoaiDiem {
  TICH_DIEM = 'TICH_DIEM',
  TIEU_DIEM = 'TIEU_DIEM',
}

@Entity('loyalty_transactions')
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: LoaiDiem })
  dungDiem!: LoaiDiem;

  @Column({ type: 'int' })
  soDiem!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  ngayGiaoDich!: Date;

  @ManyToOne(() => User, (user) => user.loyaltyTransactions)
  @JoinColumn({ name: 'idUser' })
  user!: Relation<User>;
}
