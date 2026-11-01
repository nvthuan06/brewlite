# Tài liệu Đặc tả Yêu cầu Hệ thống (SRS rút gọn) - BrewLite

## 1. Yêu cầu chức năng (Functional Requirements)

| Mã        | Tên yêu cầu                      | Nhóm tính năng      | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria)                                                                                                                   |
| :-------- | :------------------------------- | :------------------ | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **FR-01** | Xem menu                         | Menu                | **Must**         | Hệ thống hiển thị danh sách sản phẩm theo danh mục.                                                                                                        |
| **FR-02** | Xem chi tiết sản phẩm            | Chi tiết sản phẩm   | **Must**         | Khi bấm vào sản phẩm, hiển thị chi tiết (ảnh, giá, mô tả, tùy chọn size/đá/đường).                                                                         |
| **FR-03** | Quản lý giỏ hàng                 | Giỏ hàng            | **Must**         | Người dùng có thể thêm/sửa/xóa sản phẩm trong giỏ hàng. Tổng tiền cập nhật theo thời gian thực dựa trên các tùy chọn.                                      |
| **FR-04** | Xác thực và phân quyền           | Xác thực            | **Must**         | Đăng nhập/Đăng ký thành công trả về token JWT hợp lệ. Phân quyền rõ ràng giữa Khách hàng và Quản lý/Nhân viên.                                             |
| **FR-05** | Đặt đơn và thanh toán trực tuyến | Đặt đơn, Thanh toán | **Must**         | Tạo đơn hàng thành công, hiển thị QR code thanh toán qua hệ thống tích hợp (SePay). Trạng thái đơn tự động đổi sang "Đã thanh toán" khi có webhook trả về. |
| **FR-06** | Quản lý trạng thái đơn hàng      | Quản lý đơn         | **Must**         | Nhân viên quầy có thể xem danh sách đơn realtime và chuyển trạng thái (Chờ xử lý -> Đang pha chế -> Hoàn thành).                                           |
| **FR-07** | Xem lịch sử đơn hàng             | Lịch sử đơn         | **Should**       | Khách hàng xem lại được danh sách các đơn đã đặt, chi tiết từng món và trạng thái cuối cùng của đơn.                                                       |
| **FR-08** | Lập hóa đơn nhập hàng            | Quản lý kho         | **Must**         | Quản lý tạo hóa đơn nhập hàng. Khi hóa đơn lưu thành công, số lượng tồn kho của nguyên liệu/sản phẩm tương ứng tự động cộng dồn.                           |
| **FR-09** | Cập nhật tồn kho thủ công        | Quản lý kho         | **Won't**        | Tính năng tự thay đổi số lượng kho độc lập không qua hóa đơn nhập sẽ không được triển khai trong MVP này.                                                  |

## 2. Yêu cầu phi chức năng (Non-Functional Requirements)

| Mã         | Tên yêu cầu                         | Nhóm tính năng | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria)                                                                                                 |
| :--------- | :---------------------------------- | :------------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-01** | Tính khả dụng (Usability)           | Khả dụng       | **Must**         | Giao diện frontend bằng Next.js phải tuân thủ thiết kế mobile-first, có thể cài đặt như ứng dụng PWA trên điện thoại.                    |
| **NFR-02** | Hiệu năng (Performance)             | Hiệu năng      | **Should**       | Thời gian phản hồi của các API Backend (NestJS) thông thường không vượt quá 500ms.                                                       |
| **NFR-03** | Bảo mật (Security)                  | Bảo mật        | **Must**         | Toàn bộ mật khẩu lưu trong PostgreSQL phải được băm (hash). API yêu cầu quyền quản trị phải chặn các truy cập không có token hợp lệ.     |
| **NFR-04** | Khả năng triển khai (Deployability) | Triển khai     | **Must**         | Hệ thống phải có Dockerfile, docker-compose.yml và pipeline CI/CD tự động deploy lên môi trường production khi push code lên nhánh main. |

## 3. Sơ đồ Use-case tổng quát toàn hệ thống

_(Nhóm sẽ chèn hình ảnh sơ đồ Use-case vẽ trên draw.io hoặc StarUML vào đây)_

![Sơ đồ Use-case tổng quát](../diagrams/use-case-general.png)
