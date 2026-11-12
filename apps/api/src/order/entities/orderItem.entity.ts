import{Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn} from 'typeorm'
import{SIZE, TOPPING} from '../enum/orderitem.enum.js'
import{Order} from './order.entity.js'
import type {Product} from '../../products/entities/product.entity.js'
@Entity('OrderItem')

export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id:string;

    @Column({type:'int'})
    soLuong:number;

    @Column({type:'decimal', precision: 10, scale:0})
    thanhTien:number;

    @Column({
        type: 'enum',
        enum: SIZE,
    })
    size:SIZE;

    @Column({
        type: 'enum',
        enum: TOPPING,
        nullable: true
    })
    topping:TOPPING;

    @ManyToOne(()=> Order, (order)=> order.orderitem)
    @JoinColumn({name: 'Id_Order'})
    order : Order;

    @ManyToOne('Product', 'orderitem')
    @JoinColumn({name:'id_product'})
    product : Product


}