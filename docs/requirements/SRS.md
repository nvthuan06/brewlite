# Tài liệu Đặc tả Yêu cầu Hệ thống (SRS rút gọn) - BrewLite

## 1. Yêu cầu chức năng (Functional Requirements)

| Mã        | Tên yêu cầu                 | Nhóm tính năng      | Ưu tiên    | Tiêu chí chấp nhận (Acceptance Criteria)                                                                                          |
| :-------- | :-------------------------- | :------------------ | :--------- | :-------------------------------------------------------------------------------------------------------------------------------- |
| **FR-01** | Xem menu                    | Menu                | **Must**   | Hệ thống hiển thị danh sách sản phẩm.                                                                                             |
| **FR-02** | Xem chi tiết sản phẩm       | Menu                | **Must**   | Hiển thị giá, tên có thể chọn size/topping.                                                                                       |
| **FR-03** | Quản lý giỏ hàng            | Giỏ hàng            | **Must**   | Khách hàng có thể thêm/sửa/xóa sản phẩm. Tổng tiền cập nhật theo thời gian thực dựa trên các tùy chọn.                            |
| **FR-04** | Đăng ký tài khoản           | Xác thực            | **Must**   | Khách hàng mới có thể đăng ký tài khoản. Thông tin mật khẩu phải được mã hóa (hash) trước khi lưu vào PostgreSQL.                 |
| **FR-05** | Đăng nhập hệ thống          | Xác thực            | **Must**   | Người dùng đăng nhập thành công bằng tài khoản hợp lệ, hệ thống trả về token JWT để duy trì phiên đăng nhập.                      |
| **FR-06** | Phân quyền truy cập         | Phân quyền          | **Must**   | Hệ thống dựa vào JWT để cấp quyền: Khách hàng (chỉ đặt hàng), Nhân viên (cập nhật trạng thái đơn), Quản lý (được quyền nhập kho). |
| **FR-07** | Đặt và thanh toán đơn hàng  | Đặt đơn, Thanh toán | **Must**   | Tạo đơn hàng thành công để chuyển sang thanh toán.                                                                                |
| **FR-08** | Quản lý trạng thái đơn hàng | Quản lý đơn         | **Must**   | Nhân viên quầy có thể xem danh sách đơn realtime và chuyển trạng thái (Chờ xử lý -> Đang pha chế -> Hoàn thành).                  |
| **FR-09** | Xem lịch sử đơn hàng        | Lịch sử đơn         | **Should** | Khách hàng xem lại được danh sách các đơn đã đặt và trạng thái hiện tại của đơn hàng.                                             |
| **FR-10** | Lập hóa đơn nhập hàng       | Quản lý kho         | **Must**   | Quản lý tạo hóa đơn nhập hàng. Khi hóa đơn lưu thành công, số lượng tồn kho tương ứng tự động cộng dồn.                           |
| **FR-11** | Cập nhật tồn kho thủ công   | Quản lý kho         | **Won't**  | Tính năng tự thay đổi số lượng kho độc lập không qua hóa đơn nhập sẽ không được triển khai trong MVP này.                         |

## 2. Yêu cầu phi chức năng (Non-Functional Requirements)

| Mã         | Tên yêu cầu                         | Nhóm tính năng | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria)                                                                                                 |
| :--------- | :---------------------------------- | :------------- | :--------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| **NFR-01** | Tính khả dụng (Usability)           | Khả dụng       | **Must**         | Giao diện frontend bằng Next.js phải tuân thủ thiết kế mobile-first, có thể cài đặt như ứng dụng PWA trên điện thoại.                    |
| **NFR-02** | Hiệu năng (Performance)             | Hiệu năng      | **Should**       | Thời gian phản hồi của các API Backend (NestJS) thông thường không vượt quá 500ms.                                                       |
| **NFR-03** | Bảo mật (Security)                  | Bảo mật        | **Must**         | Toàn bộ mật khẩu lưu trong PostgreSQL phải được băm (hash). API yêu cầu quyền quản trị phải chặn các truy cập không có token hợp lệ.     |
| **NFR-04** | Khả năng triển khai (Deployability) | Triển khai     | **Must**         | Hệ thống phải có Dockerfile, docker-compose.yml và pipeline CI/CD tự động deploy lên môi trường production khi push code lên nhánh main. |

## 3. Sơ đồ Use-case tổng quát toàn hệ thống

![Sơ đồ Use-case tổng quát](../diagrams/use-case.png)

## 4. Đặc tả Use-case trọng tâm: Đặt và thanh toán đơn hàng

**Thông tin cơ bản:**

- **Tên Use-case:** Đặt và thanh toán đơn hàng.
- **Mã yêu cầu (Traceability):** FR-07 (Đặt đơn/thanh toán), FR-03 (Giỏ hàng), FR-05 (Đăng nhập).
- **Actor:** Khách hàng.
- **Sự kiện kích hoạt (Trigger):** Khi khách hàng nhấn nút "Thanh toán" tại màn hình Giỏ hàng.

**Bảng đặc tả chi tiết:**

| Thuộc tính         | Đặc tả chi tiết                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :----------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mục đích**       | Cho phép khách hàng thanh toán và ghi nhận hóa đơn. Khi khách hàng chốt nước uống, đồ ăn.                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Luồng chính**    | 1. Khách hàng bấm nút "Thanh toán" ở trang giỏ hàng và chọn "Thanh toán qua mã QR".<br>2. Hệ thống tính tổng tiền, tạo Order ID và lưu vào database với trạng thái "Chờ thanh toán".<br>3. Hệ thống sinh mã QR chứa thông tin thanh toán hiển thị cho khách.<br>4. Khách hàng sử dụng app ngân hàng quét mã và chuyển tiền.<br>5. Cổng thanh toán gửi Webhook xác nhận giao dịch về BrewLite.<br>6. Hệ thống đối chiếu số tiền, cập nhật trạng thái đơn thành "Đã thanh toán".<br>7. Hệ thống xóa giỏ hàng và hiển thị thông báo đặt hàng thành công. |
| **Luồng phụ**      | **- Đổi ý:** Tại bước 3, nếu khách bấm "Quay lại", hệ thống hủy mã QR, đưa khách về lại giỏ hàng và giữ nguyên các món đã chọn.<br>**- Quá hạn:** Sau 10 phút không có Webhook trả về, đơn hàng tự động chuyển sang "Đã hủy" do quá hạn. Khách phải đặt lại.<br>**- Sai số tiền:** Tại bước 5, nếu Webhook báo số tiền nhận nhỏ hơn bill thực tế, đơn chuyển "Thanh toán thiếu". Khách cần liên hệ quầy xử lý.<br>**- Lỗi database:** Tại bước 2, nếu PostgreSQL lỗi, báo "Lỗi do hệ thống" và giữ nguyên giỏ hàng.                                   |
| **Tiền điều kiện** | - Khách hàng đã đăng nhập thành công.<br>- Giỏ hàng phải có sản phẩm.<br>- Đã kết nối thành công với API cổng thanh toán.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **Hậu điều kiện**  | - Hóa đơn được tạo thành công trong PostgreSQL.<br>- Giỏ hàng của khách hàng được làm trống.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

## 5. Đặc tả Use-case: Xem chi tiết sản phẩm
![Sơ đồ Use-case xem chi tiết sản phẩm](../diagrams/use-case_FR-02.png)

**Thông tin cơ bản:**

- **Tên Use-case:** Xem chi tiết sản phẩm.
- **Mã yêu cầu (Traceability):** FR-02 (Xem chi tiết sản phẩm); FR-01 (Xem menu); NFR-01 (Tính khả dụng); NFR-02 (Hiệu năng).
- **Actor:** Khách hàng.
- **Sự kiện kích hoạt (Trigger):** Khách hàng chọn một sản phẩm từ danh sách sản phẩm trên màn hình Menu.

**Bảng đặc tả chi tiết:**

| Thuộc tính | Đặc tả chi tiết |
| :--- | :--- |
| **Mục đích** | Cho phép khách hàng xem thông tin chi tiết của sản phẩm (tên, giá) và lựa chọn các tùy chọn đi kèm (size, topping). |
| **Luồng chính** | 1. Khách hàng chọn một sản phẩm từ danh sách trên trang "Menu".<br>2. Hệ thống truy xuất dữ liệu sản phẩm từ PostgreSQL.<br>3. Hệ thống hiển thị thông tin chi tiết gồm: tên sản phẩm, giá bán và các tùy chọn size/topping.<br>4. Khách hàng chọn size và topping mong muốn.<br>5. Hệ thống cập nhật mức giá hiển thị tương ứng với các tùy chọn đã chọn. |
| **Luồng phụ** | **- Sản phẩm không tồn tại:** Không tìm thấy thông tin sản phẩm trong cơ sở dữ liệu; hệ thống thông báo lỗi và đưa khách hàng quay lại trang Menu.<br>**- Lỗi hệ thống:** Không thể truy xuất dữ liệu từ PostgreSQL; hệ thống thông báo lỗi tải dữ liệu. |
| **Tiền điều kiện** | - Hệ thống hiển thị danh sách sản phẩm (Menu) và cơ sở dữ liệu PostgreSQL đang hoạt động. |
| **Hậu điều kiện** | - Thông tin tên, giá và các tùy chọn size/topping của sản phẩm được hiển thị cho khách hàng. |

## 6. Đặc tả Use-case: Lập hóa đơn nhập hàng
![Sơ đồ Use-case lập hóa đơn nhập hàng](../diagrams/use-case_FR-10.png)

**Thông tin cơ bản:**

- **Tên Use-case:** Lập hóa đơn nhập hàng.
- **Mã yêu cầu (Traceability):** FR-10 (Lập hóa đơn nhập hàng); FR-05 (Đăng nhập hệ thống); FR-06 (Phân quyền truy cập); NFR-03 (Bảo mật).
- **Actor:** Quản lý.
- **Sự kiện kích hoạt (Trigger):** Quản lý chọn chức năng "Lập hóa đơn nhập hàng".

**Bảng đặc tả chi tiết:**

| Thuộc tính | Đặc tả chi tiết |
| :--- | :--- |
| **Mục đích** | Cho phép Quản lý tạo hóa đơn nhập hàng; khi hóa đơn lưu thành công, số lượng tồn kho tương ứng tự động cộng dồn. |
| **Luồng chính** | 1. Quản lý mở chức năng "Lập hóa đơn nhập hàng".<br>2. Hệ thống kiểm tra token JWT để xác thực phiên đăng nhập và quyền Quản lý.<br>3. Quản lý nhập thông tin hóa đơn nhập hàng và số lượng hàng nhập, sau đó nhấn lưu.<br>4. Hệ thống kiểm tra tính hợp lệ của thông tin hóa đơn.<br>5. Hệ thống lưu hóa đơn nhập hàng vào PostgreSQL và tự động cộng dồn số lượng tồn kho tương ứng.<br>6. Hệ thống thông báo lập hóa đơn nhập hàng thành công. |
| **Luồng phụ** | **- Không có quyền truy cập:** Yêu cầu không có token JWT hợp lệ hoặc tài khoản không thuộc quyền Quản lý; API chặn truy cập theo quy định bảo mật.<br>**- Thông tin không hợp lệ:** Dữ liệu nhập thiếu hoặc số lượng không hợp lệ; hệ thống thông báo để Quản lý sửa lại.<br>**- Lỗi hệ thống:** Không thể lưu dữ liệu vào PostgreSQL; hệ thống thông báo tạo hóa đơn thất bại, số lượng tồn kho giữ nguyên không thay đổi. |
| **Tiền điều kiện** | - Quản lý đã đăng nhập thành công vào hệ thống và có token JWT hợp lệ với quyền Quản lý.<br>- Hệ thống quản lý kho và cơ sở dữ liệu PostgreSQL hoạt động bình thường. |
| **Hậu điều kiện** | - Hóa đơn nhập hàng mới được lưu thành công trong PostgreSQL.<br>- Số lượng tồn kho tương ứng được tự động cộng dồn. |