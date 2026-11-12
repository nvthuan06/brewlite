import { IsEnum, IsNotEmpty } from "class-validator";
import { TrangThaiDonHang } from "../enum/order.enum.js";

export class UpdateOrderStatusDto {
    @IsEnum(TrangThaiDonHang, {message: 'Trạng thái đơn hàng không hợp lệ'})
    @IsNotEmpty({message: 'Trạng thái đơn hàng không được để trống'})
    trangThai: TrangThaiDonHang;
}