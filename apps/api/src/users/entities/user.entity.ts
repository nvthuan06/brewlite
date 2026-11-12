import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  // select:false để truy vấn mặc định không làm lộ mật khẩu đã băm.
  @Column({ name: 'passwordHash', type: 'varchar', length: 255, select: false })
  passwordHash!: string;

  @Column({ type: 'int', default: 0 })
  loyaltyPoints!: number;
}