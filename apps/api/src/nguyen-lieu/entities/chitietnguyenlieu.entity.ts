import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne,type Relation } from 'typeorm';
import { Product } from '../../products/entities/product.entity.js';
import { NguyenLieu } from './nguyen-lieu.entity.js';

@Entity('chitietnguyenlieu')
export class ChiTietNguyenLieu{
    @PrimaryGeneratedColumn()
    id:number

    @ManyToOne(()=>NguyenLieu,(nl)=>nl.chitietnguyenlieu)
    @JoinColumn({name:'id_nguyenlieu'})
    nguyenlieu: Relation<NguyenLieu>

    @ManyToOne(()=>Product,(pd)=>pd.chitietnguyenlieu)
    @JoinColumn({name:'id_product'})
    product: Relation<Product>

    @Column()
    dinhLuong:number





}