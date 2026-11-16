import { Test, TestingModule } from '@nestjs/testing';
import { NguyenLieuController } from './nguyen-lieu.controller.js';
import { NguyenLieuService } from './nguyen-lieu.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('NguyenLieuController', () => {
  let controller: NguyenLieuController;
  let service: NguyenLieuService;

  // 1. Tạo một object giả lập lại các hàm của Service
  const mockNguyenLieuService = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    capNhatSoLuong: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NguyenLieuController],
      providers: [
        // 2. Ép NestJS dùng bản Mock thay vì bản Service thật
        {
          provide: NguyenLieuService,
          useValue: mockNguyenLieuService,
        },
      ],
    }).compile();

    controller = module.get<NguyenLieuController>(NguyenLieuController);
    // Lấy instance của service ra để test
    service = module.get<NguyenLieuService>(NguyenLieuService);
  });

  it('nên được khởi tạo thành công', () => {
    expect(controller).toBeDefined();
  });

  // --- THÊM TEST CASE CHO CÁC API ---
  
  describe('findAll', () => {
    it('nên trả về danh sách nguyên liệu từ service', async () => {
      // Chuẩn bị dữ liệu giả mà Service sẽ trả về
      const ketQuaGia = [{ idNguyenLieu: 1, tenNguyenLieu: 'Cà phê', tonKho: 100 }];
      mockNguyenLieuService.findAll.mockResolvedValue(ketQuaGia);

      // (Giả sử trong Controller bạn có viết hàm findAll())
      // Gọi thử api từ controller
      const result = await controller.findAll();

      // Kiểm tra xem controller có gọi đúng hàm findAll của service không
      expect(service.findAll).toHaveBeenCalled();
      
      // Kiểm tra kết quả trả về có khớp không
      expect(result).toEqual(ketQuaGia);
    });
  });
});