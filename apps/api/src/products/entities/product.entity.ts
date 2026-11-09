import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

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

    @Column({ type: 'varchar'})
    urlAnh: string;
}
