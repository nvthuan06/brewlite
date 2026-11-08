# ADR-002: Quyết định chọn kiến trúc phân lớp theo module cho NestJS

- **Trạng thái (status):** Accepted
- **Ngày quyết định (Date):** 08/11/2026
- **Người đề xuất & phê duyệt (Deciders):** Nhóm phát triển dự án BrewLite
- **Liên kết yêu cầu/Task:** Task 3.1 (Phương pháp và quyết định kiến trúc)
---

## 1. Bối cảnh và Vấn đề

**BrewLite** sử dụng NestJS và TypeScript để xây dựng backend API cho frontend Next.js. Backend xử lý các chức năng như xác thực, người dùng, sản phẩm, đơn hàng, thanh toán và nguyên liệu; dữ liệu được lưu trữ trên PostgreSQL thông qua TypeORM.

Nếu đặt toàn bộ endpoint và nghiệp vụ vào một vài tệp lớn, các chức năng sẽ phụ thuộc lẫn nhau, khó kiểm thử và khó bảo trì. Ngược lại, chia ứng dụng thành nhiều dịch vụ độc lập ngay từ đầu sẽ làm tăng độ phức tạp triển khai và vận hành so với quy mô của đồ án.

**Vấn đề đặt ra:** Nhóm cần lựa chọn kiến trúc backend dễ hiểu, phù hợp với NestJS, phân chia được trách nhiệm theo nghiệp vụ và có luồng xử lý rõ ràng từ API đến nghiệp vụ và dữ liệu.

## 2. Các yếu tố thúc đẩy quyết định

- **Tách biệt trách nhiệm:** Controller tiếp nhận request và trả response; service xử lý nghiệp vụ; lớp truy cập dữ liệu làm việc với PostgreSQL/TypeORM.
- **Phân chia theo nghiệp vụ:** Các chức năng Auth, Users, Products, Orders, Payments và NguyenLieu cần có ranh giới riêng để thuận tiện phát triển và bảo trì.
- **Khả năng làm việc nhóm:** Các thành viên có thể làm việc trên những module khác nhau, giảm xung đột và giới hạn ảnh hưởng của thay đổi.
- **Phù hợp với NestJS:** NestJS hỗ trợ sẵn module, controller, provider và dependency injection.
- **Đơn giản cho MVP:** Backend có thể triển khai như một ứng dụng duy nhất bằng Docker Compose, không cần vận hành nhiều dịch vụ độc lập.
- **Kiểm thử:** Các service có thể được kiểm thử riêng; các endpoint có thể được kiểm tra thông qua controller và kiểm thử tích hợp.

## 3. Các phương án đã cân nhắc

**Phương án 1: Tổ chức theo tầng toàn cục (controllers/services/repositories dùng chung).**

- *Ưu điểm:* Cấu trúc ban đầu đơn giản; dễ tìm các lớp cùng loại.
- *Nhược điểm:* Các tệp của cùng một chức năng bị phân tán qua nhiều thư mục; ranh giới nghiệp vụ khó nhận biết khi dự án phát triển.

**Phương án 2: Kiến trúc phân lớp theo module nghiệp vụ (Modular Monolith).**

- *Ưu điểm:* Kết hợp phân lớp với phân chia theo nghiệp vụ; mỗi module tập hợp các thành phần liên quan và phù hợp với cơ chế của NestJS.
- *Nhược điểm:* Các module vẫn chạy trong cùng một tiến trình. Nếu không kiểm soát imports, exports và phụ thuộc chéo, ranh giới module có thể bị suy yếu.

**Phương án 3: Microservices.**

- *Ưu điểm:* Có thể triển khai, mở rộng và cô lập từng dịch vụ độc lập.
- *Nhược điểm:* Tăng độ phức tạp về giao tiếp giữa các dịch vụ, triển khai, logging, bảo mật và kiểm thử; chưa phù hợp với quy mô MVP và nguồn lực hiện tại của nhóm.

## 4. Quyết định

Nhóm quyết định chọn **Phương án 2: Kiến trúc phân lớp theo module nghiệp vụ cho NestJS**, triển khai backend dưới dạng **Modular Monolith**.

Luồng xử lý tổng quát:

```text
Next.js / PWA
      │ HTTP / JSON
      ▼
Controller (tiếp nhận request và trả response)
      ▼
Service (xử lý và điều phối nghiệp vụ)
      ▼
TypeORM / Repository (truy vấn và ghi dữ liệu)
      ▼
PostgreSQL
```

Mỗi module chịu trách nhiệm cho một nhóm chức năng. Các module được đăng ký tại `AppModule`; module chỉ nên công khai provider cần thiết thông qua `exports` khi module khác có nhu cầu sử dụng.

### 4.1. Cấu trúc backend

Cấu trúc khái quát của backend hiện tại:

```text
backend/src/
├── app.module.ts                 # Lắp ghép module và cấu hình ứng dụng
├── main.ts                       # Khởi tạo NestJS và cấu hình HTTP
├── auth/                         # Xác thực, DTO, guard và strategy
├── users/                        # Chức năng người dùng
├── products/                     # Chức năng sản phẩm
├── orders/                       # Chức năng đơn hàng, DTO và entities
├── payments/                     # Thanh toán và mock payment service
└── NguyenLieu/                   # Chức năng nguyên liệu
```

Tên thư mục `NguyenLieu` được giữ theo cách đặt tên hiện có trong repository.

### 4.2. Trách nhiệm các lớp

- **Controller:** Khai báo endpoint, nhận dữ liệu từ request, gọi service và trả kết quả cho client. Controller không nên chứa quy tắc nghiệp vụ hoặc truy vấn cơ sở dữ liệu trực tiếp.
- **Service:** Thực hiện và điều phối nghiệp vụ của module. Ví dụ, `OrdersService` xử lý luồng đơn hàng; `PaymentsService` xử lý nghiệp vụ thanh toán và có thể sử dụng `MockPaymentService` để mô phỏng gateway.
- **DTO:** Mô tả dữ liệu request/response cho API, hỗ trợ kiểm tra dữ liệu đầu vào và giúp tách cấu trúc giao tiếp HTTP khỏi entity lưu trữ.
- **Entity và truy cập dữ liệu:** Entity được TypeORM ánh xạ với PostgreSQL. Module khai báo các entity cần dùng bằng `TypeOrmModule.forFeature(...)`; service thao tác dữ liệu thông qua TypeORM/repository.
- **Module:** Khai báo `imports`, `controllers`, `providers` và `exports`, qua đó xác định phạm vi dependency injection và ranh giới chức năng.
- **Bootstrap và cấu hình:** `main.ts` khởi tạo ứng dụng, cấu hình `ValidationPipe`, CORS và cổng HTTP. `AppModule` nạp cấu hình môi trường và thiết lập kết nối PostgreSQL/TypeORM.

### 4.3. Áp dụng trong repository hiện tại

- `AppModule` đăng ký các module `ProductsModule`, `OrdersModule`, `UsersModule`, `AuthModule`, `PaymentsModule` và `NguyenLieuModule`; đồng thời cấu hình `ConfigModule` và kết nối TypeORM tới PostgreSQL.
- `AuthModule` đăng ký `AuthController`, `AuthService`, `JwtStrategy` và sử dụng `UsersModule`.
- `OrdersModule` gom `OrdersController`, `OrdersService` cùng các entity liên quan đến đơn hàng, sản phẩm và người dùng.
- `PaymentsModule` gom `PaymentsController`, `PaymentsService` và `MockPaymentService`; module đăng ký các entity thanh toán, đơn hàng và người dùng.
- `ProductsModule`, `UsersModule` và `NguyenLieuModule` tách các chức năng sản phẩm, người dùng và nguyên liệu thành những module riêng.

Kiến trúc này phân lớp ở cấp ứng dụng và module; đây không phải Clean Architecture thuần túy. Một số service hiện làm việc trực tiếp với TypeORM và entity persistence. Nhóm lựa chọn cách tiếp cận này vì phù hợp với quy mô và trạng thái hiện tại của dự án, thay vì bổ sung các lớp trừu tượng chưa cần thiết.

## 5. Hệ quả của quyết định

### Ưu điểm

- Ranh giới nghiệp vụ rõ hơn so với việc gom nhiều chức năng vào một nơi.
- Luồng Controller → Service → truy cập dữ liệu thống nhất, giúp thành viên mới dễ đọc và phát triển tính năng.
- Tận dụng module và dependency injection của NestJS, thuận tiện cho việc kiểm thử và thay thế provider.
- Triển khai đơn giản như một ứng dụng backend cùng PostgreSQL, phù hợp với Docker Compose và MVP.
- Có thể bổ sung dần validation, logging và các adapter tích hợp bên ngoài mà chưa cần chuyển sang microservices.

### Hạn chế và đánh đổi

- Các module vẫn dùng chung tiến trình và cơ sở dữ liệu; phụ thuộc chéo không được kiểm soát có thể làm mờ ranh giới module.
- Việc service và entity phụ thuộc trực tiếp vào TypeORM có thể làm tăng công sức nếu sau này cần thay ORM hoặc tách module thành dịch vụ độc lập.
- Không thể triển khai hoặc mở rộng từng domain độc lập như kiến trúc microservices.
- Chia ứng dụng thành module không tự động đảm bảo chất lượng kiến trúc; nhóm cần duy trì controller mỏng, giới hạn imports/exports và đặt nghiệp vụ trong service phù hợp.

### Lưu ý triển khai

- `AppModule` hiện cấu hình `synchronize: true` cho TypeORM với chú thích chỉ dùng trong môi trường phát triển. Đây không phải cơ chế migration có lịch sử. Trước khi sử dụng production, cần tắt `synchronize` và bổ sung quy trình migration có kiểm soát.
- Cấu hình nhạy cảm cần được lấy từ biến môi trường thông qua `ConfigModule`/`ConfigService`, không ghi trực tiếp bí mật vào mã nguồn.
- Logging có cấu trúc và health check cần được triển khai hoặc chuẩn hóa như các mối quan tâm xuyên suốt; không xem chúng là tính năng đã hoàn thiện nếu chưa được xây dựng.
- Các module chỉ nên export provider cần thiết, tránh để module khác phụ thuộc trực tiếp vào chi tiết nội bộ nếu không có nhu cầu.

---

**BrewLite – Đồ án Công nghệ Phần mềm | Nhóm 12**