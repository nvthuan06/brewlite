import{Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany} from 'typeorm'
import {TrangThaiDonHang} from '../enum/order.enum.js'
import {OrderItem} from './orderItem.entity.js'


@Entity('Order')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    idOrder: string;

    @Column({type:'decimal', precision: 10, scale:0})
    tongTien: number;

    @CreateDateColumn({
        type: 'timestamp without time zone'
    })
    ngayDatHang: Date;

    @Column({
        type: 'enum',
        enum: TrangThaiDonHang,
        default: TrangThaiDonHang.DA_NHAN
    })
    trangThai: TrangThaiDonHang;

    @OneToMany(()=>OrderItem, (orderItem)=>orderItem.order,{cascade:true})
    orderitem:OrderItem[]
}
