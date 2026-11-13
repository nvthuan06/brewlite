import { IsString, IsNotEmpty, IsNumber, Min, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class CreatePromotionDto {
  @IsString({ message: 'Mã khuyến mãi phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã khuyến mãi không được để trống' })
  maPromotion: string;

  @IsNumber({}, { message: 'Giá trị giảm giá phải là số' })
  @Min(0, { message: 'Giá trị giảm giá không được âm' })
  giamGia: number;

  @IsDateString({}, { message: 'Hạn sử dụng phải là định dạng ngày tháng hợp lệ (ISO 8601)' })
  @IsNotEmpty({ message: 'Hạn sử dụng không được để trống' })
  hanPromotion: Date;

  @IsBoolean({ message: 'Trạng thái hoạt động phải là true hoặc false' })
  @IsOptional()
  trangThaiHoatDong?: boolean;
}