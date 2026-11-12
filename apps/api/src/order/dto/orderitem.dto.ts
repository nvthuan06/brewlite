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
import { SIZE, TOPPING } from '../enum/orderitem.enum.js';


export class OrderItemDto {
  @IsInt({ message: 'ID sản phẩm phải là số nguyên' })
  @IsNotEmpty()
  productId: number;

  @IsInt({ message: 'Số lượng phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu phải là 1' })
  soLuong: number;

  @IsEnum(SIZE, { message: 'Size không hợp lệ (chỉ nhận S, M, XL)' })
  @IsNotEmpty()
  size: SIZE;

  @IsEnum(TOPPING, { message: 'Topping không hợp lệ' })
  @IsOptional() // Không bắt buộc, khách có thể không chọn topping
  topping?: TOPPING;
}