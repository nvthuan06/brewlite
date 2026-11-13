import{Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, JoinColumn, ManyToOne} from 'typeorm'
import {TrangThaiDonHang} from '../enum/order.enum.js'
import {OrderItem} from './orderItem.entity.js'
import { Promotion } from '../../promotion/entities/promotion.entity.js';
import { User } from '../../users/entities/user.entity.js';


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

    @ManyToOne(() => User, (user) => user.orders, { nullable: false, onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'idUser' })
    user: User;

    @OneToMany(()=>OrderItem, (orderItem)=>orderItem.order,{cascade:true})
    orderitem:OrderItem[];

    @ManyToOne(() => Promotion, (promotion) =>promotion.orders ,{ nullable: true })
    @JoinColumn({ name: 'idPromotion' })
    promotion: Promotion;
    
}
