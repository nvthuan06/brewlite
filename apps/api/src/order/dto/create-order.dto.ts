import { 
  IsString, 
  IsNotEmpty, 
  IsArray, 
  ValidateNested, 
  IsUUID, 
  IsInt, 
  Min, 
  IsEnum, 
  IsOptional 
} from 'class-validator';
import { Type } from 'class-transformer';
import {OrderItemDto} from './orderitem.dto.js'
export class CreateOrderDto {
    @IsString()
    @IsNotEmpty({message:"Không được để idempotencyKey"})
    idempotencyKey:string

    @IsArray({ message: 'Giỏ hàng (items) phải là một mảng' })
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items: OrderItemDto[];
}
