import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany,type Relation } from 'typeorm';
import { ChiTietNguyenLieu } from './chitietnguyenlieu.entity.js';

@Entity('nguyenlieu')
export class NguyenLieu {
    @PrimaryGeneratedColumn()
    idNguyenLieu:number;

    @Column()
    tenNguyenLieu:string

    @Column()
    tonKho:number

    @Column()
    donVi:string

    @OneToMany(()=>ChiTietNguyenLieu,(ctnl)=>ctnl.nguyenlieu)
    chitietnguyenlieu:Relation<ChiTietNguyenLieu>[];
}
