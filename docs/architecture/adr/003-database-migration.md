# ADR-003: Quyết định quản lý lược đồ bằng TypeORM Migration và xử lý giao dịch (Transaction) cho PostgreSQL

- **Trạng thái (status):** Accepted
- **Ngày quyết định (Date):** 08/11/2026
- **Người đề xuất & phê duyệt (Deciders):** Nhóm phát triển dự án BrewLite
- **Liên kết yêu cầu/Task:** Task 2.2 (Sequence diagram - Transaction tạo đơn & tồn kho), Task 2.3 (Class diagram), Task 3.1 (Phương pháp và quyết định kiến trúc), Task 4.3 (MVP Sprint 1 - Seed data), Task 5.2 (Tích hợp và kiểm thử - Migration/Seed tái tạo DB), Task 5.3 (CD - Chạy migration an toàn & Rollback)
---

## 1. Bối cảnh và Vấn đề

**BrewLite** sử dụng **NestJS** và **TypeORM** để quản lý dữ liệu trên **PostgreSQL** cho toàn bộ luồng nghiệp vụ từ xem menu, chọn tùy chọn, giỏ hàng, đặt đơn, thanh toán qua cổng **SePay** đến theo dõi đơn. Theo mô hình domain tại **Task 2.3** và cấu trúc phân lớp module tại **ADR-002**, cơ sở dữ liệu lưu trữ các thực thể cốt lõi gồm: `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction` cùng nhóm thực thể quản lý tồn kho `NguyenLieu`.

Khi triển khai qua 2 Sprint và thiết lập pipeline CI/CD theo yêu cầu của đồ án, hệ thống đối mặt với ba vấn đề kỹ thuật lớn:

- **Rủi ro mất dữ liệu và không thể tái tạo Database nếu dùng `synchronize: true`:** Ở giai đoạn dựng khung ban đầu, `AppModule` bật `synchronize: true` để tạo bảng nhanh. Tuy nhiên, khi 6 thành viên cùng cập nhật các lớp thực thể (`Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`), TypeORM có thể tự động xóa cột (`DROP COLUMN`) làm mất dữ liệu mẫu (seed data). Quan trọng hơn, `synchronize: true` không lưu lại lịch sử thay đổi lược đồ, không đáp ứng được yêu cầu **Task 5.2** (có bộ migration/seed tái tạo được database) và **Task 5.3** (chạy migration an toàn và có cơ chế rollback khi triển khai production thất bại).
- **Nguy cơ sai lệch dữ liệu khi tạo đơn, cập nhật tồn kho và đối soát thanh toán SePay (Task 2.2):** Theo Sequence Diagram ở **Task 2.2**, một yêu cầu đặt và thanh toán đơn hàng phải đi qua chuỗi thao tác ghi dữ liệu liên tiếp trên PostgreSQL: tạo bản ghi `Order` và các dòng `OrderItem`, kiểm tra và trừ tồn kho (`Product`/`NguyenLieu`), áp dụng mã khuyến mãi (`Promotion`), ghi nhận biến động điểm tích lũy (`LoyaltyTransaction` và cập nhật số dư điểm của `User`), đồng thời khởi tạo và cập nhật bản ghi giao dịch (`Payment`) khi tương tác với cổng thanh toán **SePay**. Nếu một bước gặp sự cố (ví dụ hết hàng đột xuất hoặc giao dịch qua SePay thất bại/hết hạn trả về `PAYMENT_FAILED`) mà không có cơ chế hoàn tác (Rollback), hệ thống sẽ rơi vào trạng thái dữ liệu không nhất quán (khách bị trừ điểm hoặc kho bị trừ nguyên liệu nhưng đơn hàng không thành công).
- **Xung đột dữ liệu khi phát sinh request hoặc Webhook trùng lặp:** Như đã phân tích tại **ADR-004**, khi mạng chập chờn khiến client gửi lại yêu cầu thanh toán kèm `Idempotency-Key`, hoặc khi cổng thanh toán **SePay** gọi lại (retry) Webhook xác nhận giao dịch nhiều lần liên tiếp, nếu việc kiểm tra khóa và cập nhật trạng thái đơn không được đặt trong một giao dịch cô lập (Transaction), nhiều request đồng thời vẫn có thể vượt qua bước kiểm tra và ghi trùng dữ liệu.

**Vấn đề đặt ra:** Nhóm cần thiết lập cơ chế quản lý lược đồ bằng **TypeORM Migration & Seed** để tái tạo cơ sở dữ liệu nhất quán ở mọi môi trường (Local Docker, CI Test, Production), đồng thời chuẩn hóa việc sử dụng **PostgreSQL Transaction** để bảo toàn tính toàn vẹn dữ liệu (ACID) cho luồng tạo đơn, cập nhật tồn kho và xử lý giao dịch với cổng thanh toán SePay.

## 2. Các yếu tố thúc đẩy quyết định

- **Tuân thủ thiết kế Sequence Diagram (Task 2.2):** Sơ đồ tuần tự bắt buộc thể hiện rõ khối `Transaction` khi tạo đơn hàng và cập nhật tồn kho, kết hợp với nhánh `alt` (thanh toán qua SePay thành công/thất bại) và kiểm tra `Idempotency-Key`.
- **Khả năng tái tạo cơ sở dữ liệu độc lập (Task 4.3 & Task 5.2):** Một người không thuộc nhóm (hoặc runner của GitHub Actions) khi chạy `docker-compose.yml` phải tái tạo được chính xác toàn bộ cấu trúc bảng và dữ liệu mẫu (menu sản phẩm, tùy chọn size/topping, tài khoản test) thông qua lệnh chạy migration và seed.
- **Triển khai Continuous Delivery an toàn và hỗ trợ Rollback (Task 5.3 & Task 5.4):** Pipeline CD yêu cầu bước chạy migration an toàn trước khi gọi `GET /health` (Smoke Test), đồng thời phải cung cấp phương án rollback rõ ràng trong `README.md` và pipeline khi triển khai thất bại.
- **Tận dụng Transactional DDL của PostgreSQL:** PostgreSQL cho phép thực thi các câu lệnh thay đổi cấu trúc bảng (`CREATE`, `ALTER`, `DROP`) bên trong một Transaction. Nếu một tệp migration gặp lỗi ở bất kỳ câu lệnh nào, toàn bộ thay đổi cấu trúc trong tệp đó sẽ tự động được hoàn tác, giữ cho database production không bị hỏng lược đồ giữa chừng.

## 3. Các phương án đã cân nhắc

**Phương án 1: Giữ nguyên `synchronize: true` trong TypeORM và thực hiện các lệnh `repository.save()` rời rạc.**

- *Ưu điểm:* Tốc độ phát triển ban đầu nhanh, không cần cấu hình CLI hay tạo tệp migration khi sửa đổi Entity.
- *Nhược điểm:* Không có lịch sử phiên bản cơ sở dữ liệu trên Git; không thể thực hiện rollback schema trên môi trường production (**Task 5.3**); dễ gây mất dữ liệu khi làm việc nhóm và dẫn đến sai lệch tồn kho/điểm thưởng khi luồng đặt đơn hoặc đối soát thanh toán SePay bị lỗi giữa chừng.

**Phương án 2: Viết tệp kịch bản SQL thuần (`*.sql`) thủ công và quản lý Transaction bằng câu lệnh SQL thô (`BEGIN`, `COMMIT`, `ROLLBACK`).**

- *Ưu điểm:* Kiểm soát chi tiết từng câu lệnh SQL chạy trên PostgreSQL mà không phụ thuộc vào ORM.
- *Nhược điểm:* Dễ xảy ra bất đồng bộ giữa các class Entity trong mã nguồn NestJS và cấu trúc bảng thực tế (vi phạm tiêu chí nghiệm thu của **Task 2.3** yêu cầu Class Diagram, mô hình dữ liệu và code không mâu thuẫn nhau); tốn công tự xây dựng bảng theo dõi lịch sử những tệp SQL đã chạy.

**Phương án 3: Sử dụng TypeORM Migration (kèm Seed scripts) và điều phối Transaction thông qua `DataSource` / `QueryRunner` của TypeORM.**

- *Ưu điểm:* Tự động đối chiếu các class Entity (`User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`, `NguyenLieu`) với PostgreSQL để sinh tệp migration có đầy đủ hàm nâng cấp (`up`) và hoàn tác (`down`); tích hợp trực tiếp với kiến trúc phân lớp của NestJS (**ADR-002**) và hỗ trợ chạy tự động an toàn trong pipeline CI/CD.
- *Nhược điểm:* Các thành viên phải tuân thủ quy trình tạo và kiểm tra tệp migration trước khi mở Pull Request; cần quản lý vòng đời kết nối cẩn thận khi dùng `QueryRunner`.

## 4. Quyết định

Nhóm quyết định chọn **Phương án 3: Sử dụng TypeORM Migration kết hợp Seed để quản lý lược đồ dữ liệu và áp dụng PostgreSQL Transaction thông qua TypeORM cho các luồng nghiệp vụ trọng tâm**.

Luồng xử lý Transaction cho nghiệp vụ Đặt và Thanh toán đơn hàng qua cổng **SePay** (khớp với Sequence Diagram tại **Task 2.2** và **ADR-004**):

```text
Customer -> Next.js UI -> NestJS API (Orders / Payments Service)
                                 │
                                 ▼
         [Bắt đầu PostgreSQL Transaction (DataSource / QueryRunner)]
                                 │
         ├── 1. Kiểm tra Idempotency-Key / Mã giao dịch SePay (chống xử lý lặp)
         ├── 2. Kiểm tra & khóa dòng tồn kho (Product / NguyenLieu)
         ├── 3. Kiểm tra & áp dụng khuyến mãi (Promotion) / điểm (LoyaltyTransaction)
         ├── 4. Tạo bản ghi Order, OrderItem & trừ tồn kho tương ứng
         └── 5. Giao tiếp cổng thanh toán SePay & lưu/cập nhật bản ghi Payment
                                 │
         ├── [Nhánh alt: Giao dịch SePay thành công (PAID)]
         │         └── Cập nhật trạng thái đơn & thanh toán -> COMMIT Transaction
         │
         └── [Nhánh alt: Hết hàng / Lỗi hệ thống / Giao dịch SePay thất bại]
                   └── ROLLBACK Transaction (hoàn tác tồn kho & điểm)
                       hoặc ghi nhận trạng thái PAYMENT_FAILED có kiểm soát
```

### 4.1. Quy chuẩn quản lý lược đồ bằng TypeORM Migration và Seed

- **Tắt `synchronize` trong quy trình chuẩn và Production:** Chuyển cấu hình `synchronize: false` (điều khiển thông qua biến môi trường trong `.env`), thay thế hoàn toàn bằng cơ chế chạy migration có kiểm soát qua các script chuẩn trong `package.json` (`migration:generate`, `migration:run`, `migration:revert`, `seed:run`).
- **Cấu trúc tệp Migration hai chiều (`up` và `down`):** Mọi thay đổi trên các thực thể domain phải được sinh thành tệp migration có gắn nhãn thời gian (`timestamp`):
  - Phương thức `up(queryRunner)`: Thực thi các thay đổi tiến tới phiên bản mới (tạo bảng, thêm cột, tạo khóa ngoại và ràng buộc `UNIQUE` cho `idempotency_key` cũng như mã tham chiếu giao dịch SePay).
  - Phương thức `down(queryRunner)`: Chứa câu lệnh hoàn tác chính xác các thay đổi của hàm `up`, phục vụ quy trình rollback ở **Task 5.3** và **Task 5.4**.
- **Thực thi Migration trong Transaction (`migrationsTransactionMode: 'each'`):** Mỗi tệp migration được bọc trong một transaction riêng của PostgreSQL. Nếu có lỗi cú pháp hoặc vi phạm ràng buộc dữ liệu khi đang chạy migration trên pipeline CD, PostgreSQL tự động hủy bỏ lần chạy đó và dừng pipeline ngay lập tức.
- **Quản lý dữ liệu mẫu (Database Seeding - Task 4.3 & Task 5.2):** Tách riêng kịch bản khởi tạo dữ liệu mẫu (danh mục đồ uống, tùy chọn size/topping, nguyên liệu, mã khuyến mãi mẫu) để phục vụ MVP Sprint 1 (`GET /products`) và chuẩn bị dữ liệu sạch cho bộ kiểm thử tích hợp/E2E ở Sprint 2.

Cấu trúc tổ chức phần cơ sở dữ liệu trong ứng dụng backend:

```text
apps/api/src/                     # (hoặc backend/src/ theo tiến độ chuyển đổi repo)
├── database/
│   ├── data-source.ts            # Cấu hình DataSource độc lập cho TypeORM CLI
│   ├── migrations/               # Các tệp lịch sử migration theo thứ tự timestamp
│   └── seeds/                    # Kịch bản nạp dữ liệu mẫu tái tạo môi trường
├── auth/
├── users/                        # Thực thể User, LoyaltyTransaction
├── products/                     # Thực thể Product (kèm cấu hình size, topping)
├── orders/                       # Thực thể Order, OrderItem, Promotion
├── payments/                     # Thực thể Payment, tích hợp SePay & xử lý Idempotency-Key
└── NguyenLieu/                   # Thực thể quản lý định mức và tồn kho nguyên liệu
```

### 4.2. Quy chuẩn xử lý Transaction trong tầng Service

Tuân thủ kiến trúc phân lớp tại **ADR-002**, tầng Controller chỉ tiếp nhận HTTP request (hoặc Webhook từ SePay) và validate DTO; toàn bộ việc khởi tạo và quản lý Transaction nằm tại tầng **Service**:

1. **Sử dụng `dataSource.transaction(async (manager) => { ... })`:**
   - Áp dụng mặc định cho luồng tạo đơn hàng (`OrdersService`), nơi cần lưu đồng thời `Order`, danh sách `OrderItem`, trừ số lượng trong `NguyenLieu`/`Product`, ghi nhận `LoyaltyTransaction` và khởi tạo thông tin thanh toán `Payment` cho SePay.
   - Nếu bất kỳ điều kiện nghiệp vụ nào không thỏa mãn (ví dụ: số lượng nguyên liệu tồn kho không đủ đáp ứng công thức món nước, hoặc mã `Promotion` hết lượt dùng), Service ném ra Exception (`BadRequestException` / `ConflictException`) và TypeORM sẽ tự động thực hiện `ROLLBACK` toàn bộ các câu lệnh ghi trước đó.
2. **Sử dụng `QueryRunner` kết hợp khóa bi quan (`pessimistic_write`):**
   - Áp dụng cho các thao tác nhạy cảm có nguy cơ tranh chấp cao (Race Condition) như khi nhiều khách hàng cùng đặt món chỉ còn 1 phần nguyên liệu cuối cùng, hoặc khi xử lý yêu cầu thanh toán và nhận Webhook callback xác nhận giao dịch từ **SePay** kèm `Idempotency-Key` trong `PaymentsService`.
   - Khi khởi tạo `QueryRunner` thủ công, bắt buộc tuân thủ cấu trúc `try ... catch ... finally`, trong đó lệnh `await queryRunner.release()` luôn phải nằm trong khối `finally` để tránh rò rỉ kết nối (Connection Leak).

### 4.3. Tích hợp vào Pipeline CI/CD và quy trình Rollback (Task 5.2, 5.3, 5.4)

- **Ở môi trường Local & CI (Task 4.4 & Task 5.2):** Khi khởi chạy bằng `docker-compose.yml` hoặc trong bước chạy Integration/E2E test trên GitHub Actions, container database PostgreSQL (gắn kèm persistent volume) sẽ được chạy `migration:run` và `seed:run` để tạo lập môi trường kiểm thử đồng nhất trước khi thực thi các bài test đặt đơn và thanh toán.
- **Ở môi trường Production trên Pipeline CD (Task 5.3):**
  1. Sau khi bước Lint, Test, Build và Push Docker Image thành công, pipeline tiến hành chạy lệnh `migration:run` một cách an toàn vào PostgreSQL production (sử dụng biến môi trường bảo mật từ GitHub Secrets, database nằm trong mạng nội bộ và không public trực tiếp).
  2. Hệ thống thực hiện kiểm tra `GET /health` và chạy Smoke Test.
  3. Nếu quá trình triển khai hoặc Smoke Test thất bại, pipeline tự động dừng lại; nhóm có thể thực thi lệnh `migration:revert` để hoàn tác phiên bản schema về trạng thái ổn định liền trước và quay lại tag Docker image cũ theo đúng hướng dẫn trong `README.md` (**Task 5.4**).

## 5. Hệ quả của quyết định

### Ưu điểm

- **Đảm bảo tính nhất quán dữ liệu theo đúng Sequence Diagram (Task 2.2):** Ngăn chặn triệt để tình trạng đơn hàng tạo dở dang, trừ sai tồn kho nguyên liệu, trừ điểm Loyalty nhiều lần hoặc cộng trùng giao dịch khi cổng SePay gửi lại Webhook.
- **Đáp ứng trọn vẹn tiêu chí nghiệm thu của Task 5.2, 5.3 và 5.4:** Cung cấp bộ migration/seed có khả năng tái tạo database 100% từ đầu, cho phép bất kỳ người chấm hoặc thành viên nào `git clone` và chạy thử ngay lập tức.
- **Truy vết rõ ràng (Task 8.1):** Mỗi tệp migration gắn liền với các lớp trong Class Diagram (**Task 2.3**) và các API tạo đơn/thanh toán SePay, giúp việc lập ma trận truy vết (`docs/traceability-matrix.md`) rõ ràng và minh bạch.

### Hạn chế và đánh đổi

- **Tăng kỷ luật trong quy trình phát triển của nhóm:** Thành viên khi sửa đổi các tệp `*.entity.ts` bắt buộc phải sinh tệp migration mới và đính kèm vào Pull Request, nếu không pipeline CI (**Task 4.4**) hoặc bước Integration Test sẽ báo lỗi lệch lược đồ.
- **Đánh đổi hiệu năng nhỏ khi khóa bản ghi:** Việc sử dụng Transaction và khóa dòng dữ liệu (`pessimistic_write`) khi kiểm tra tồn kho, `Idempotency-Key` và cập nhật trạng thái thanh toán từ SePay làm các request đến cùng lúc phải xếp hàng chờ nhau trong thời gian ngắn, nhưng đây là sự đánh đổi cần thiết để ưu tiên tính đúng đắn của dữ liệu giao dịch tài chính.

### Lưu ý triển khai

- **Lộ trình chuyển giao từ `synchronize: true`:** Nhóm giải quyết triệt để lưu ý đã nêu ở cuối **ADR-002** bằng cách trích xuất toàn bộ lược đồ hiện tại thành tệp Initial Migration chuẩn trước khi đóng gói phiên bản production.
- **Quy tắc bất biến của lịch sử Migration:** Tuyệt đối không chỉnh sửa nội dung các tệp migration đã được merge vào nhánh chính. Mọi thay đổi phát sinh trong Sprint 2 phải được tạo thành tệp migration tiếp theo.
- **Bảo mật thông tin kết nối (Task 3.2 & Task 5.4):** Tệp cấu hình `data-source.ts` chỉ đọc chuỗi kết nối PostgreSQL từ biến môi trường (`.env` ở local hoặc Secrets trên CI/CD), tuyệt đối không ghi cứng (hardcode) tài khoản hay mật khẩu database vào mã nguồn, đồng thời đảm bảo PostgreSQL trên production có persistent storage và không mở public trực tiếp ra ngoài.

---

**BrewLite – Đồ án Công nghệ Phần mềm | Nhóm 12**