# Tài liệu Mô tả Kiến trúc Hệ thống - BrewLite

## 1. Tổng quan và Phương pháp Kiến trúc

Hệ thống **BrewLite** được thiết kế dựa trên sự kết hợp giữa mô hình **C4 Model** (cấp độ System Context và Container) để biểu diễn tổng thể các khối triển khai và **Kiến trúc phân lớp theo module nghiệp vụ (Modular Monolith)** cho phần lõi Backend (theo quyết định tại [ADR-002](./adr/002-layered-architecture.md)). Toàn bộ mã nguồn, tài liệu kỹ thuật và bộ kiểm thử được tổ chức tập trung theo cấu trúc **Monorepo** (theo quyết định tại [ADR-001](./adr/001-monorepo.md)).

### 1.1. Sơ đồ Kiến trúc Tổng thể (C4 Container Level)

![Sơ đồ C4 Container Level](../diagrams/c4-container.png)

### 1.2. Kiến trúc Phân lớp trong mỗi Module (Layered Architecture)

Theo [ADR-002](./adr/002-layered-architecture.md), bên trong Backend (`apps/api/src/` hoặc `backend/src/` theo tiến độ chuyển đổi repo), kiến trúc được phân lớp ở cấp ứng dụng và module với luồng xử lý thống nhất (`Next.js/PWA -> Controller -> Service -> TypeORM/Repository -> PostgreSQL`):
1. **Presentation Layer (Controllers, DTOs & Guards):** Tiếp nhận HTTP request và trả response, kiểm tra định dạng dữ liệu đầu vào thông qua `ValidationPipe` và DTO (giúp tách cấu trúc giao tiếp HTTP khỏi entity lưu trữ), trích xuất `Idempotency-Key`, xác thực JWT (`JwtStrategy`) và kiểm tra phân quyền truy cập. Controller được giữ mỏng, không chứa quy tắc nghiệp vụ hay truy vấn cơ sở dữ liệu trực tiếp.
2. **Business Logic Layer (Services):** Thực thi và điều phối quy tắc nghiệp vụ cốt lõi của từng module (tính tổng tiền theo size/topping, khởi tạo PostgreSQL Transaction, kiểm tra khóa `idempotency`, gọi `MockPaymentService`, cộng dồn hoặc trừ định mức tồn kho).
3. **Data Access Layer (TypeORM / Repositories & Entities):** Ánh xạ các thực thể miền với bảng dữ liệu trong PostgreSQL thông qua `TypeOrmModule.forFeature(...)`, thực thi truy vấn và quản lý giao dịch nguyên tử (`DataSource` / `QueryRunner`).

---

## 2. Chi tiết các Thành phần Kiến trúc

### 2.1. Frontend: Next.js / PWA (`apps/web`)
* **Thiết kế Mobile-First & PWA:** Giao diện xây dựng bằng Next.js tuân thủ định hướng ưu tiên thiết bị di động (mobile-first) và cấu hình Web App Manifest cùng Service Worker để người dùng cài đặt trực tiếp lên điện thoại như một ứng dụng Progressive Web App (PWA) (đáp ứng **NFR-01**).
* **Quản lý trạng thái & Chống gửi lặp yêu cầu:** Quản lý giỏ hàng và tính toán tổng tiền theo thời gian thực ngay khi khách hàng chọn size hoặc topping (**FR-02**, **FR-03**). Khi khách hàng nhấn nút "Thanh toán", Next.js tự động sinh ra một chuỗi `Idempotency-Key` duy nhất và đính kèm cùng `Bearer JWT` gửi lên Backend để ngăn chặn lỗi tạo đơn trùng hoặc trừ điểm Loyalty nhiều lần khi mạng chậm ([ADR-004](./adr/004-payment-strategy.md)).
* **Xử lý trạng thái giao diện:** Đảm bảo hiển thị đầy đủ các trạng thái trung gian gồm `loading` (đang tải), `empty` (danh sách trống) và `error` (thông báo lỗi thân thiện khi API gặp sự cố).

### 2.2. Backend: NestJS theo Module / Domain (`apps/api`)
Ứng dụng Backend được khởi tạo tại `main.ts` (cấu hình `ValidationPipe`, CORS, cổng HTTP) và lắp ghép tại `AppModule` (nạp `ConfigModule`, kết nối TypeORM) từ 6 module nghiệp vụ độc lập, hướng tới mục tiêu thời gian phản hồi thông thường dưới 500ms (**NFR-02**) ([ADR-002](./adr/002-layered-architecture.md)):
* **AuthModule (`auth/` - `FR-04`, `FR-05`, `FR-06`, `NFR-03`):** Đăng ký `AuthController`, `AuthService`, `JwtStrategy` và sử dụng `UsersModule`. Xử lý đăng ký tài khoản (kiểm tra email trùng, validate mật khẩu tối thiểu 8 ký tự và băm mật khẩu trước khi lưu vào PostgreSQL), đăng nhập đối chiếu mật khẩu băm để phát hành token JWT, và cung cấp các Guard phân quyền cho 3 vai trò: `Khách hàng` (chỉ đặt hàng), `Nhân viên` (cập nhật trạng thái đơn) và `Quản lý` (lập hóa đơn nhập kho). Luồng đăng xuất (luồng phụ của `FR-05`) được xử lý stateless bằng cách xóa JWT và trạng thái phiên ở phía ứng dụng Next.js.
* **UsersModule (`users/`):** Quản lý thông tin tài khoản người dùng (`User`) và lịch sử biến động điểm tích lũy (`LoyaltyTransaction`).
* **ProductsModule (`products/` - `FR-01`, `FR-02`):** Cung cấp các endpoint `GET /products` và `GET /products/:id` để truy xuất danh sách menu, chi tiết sản phẩm, tùy chọn kích cỡ (size) và topping.
* **OrdersModule (`orders/` - `FR-07`, `FR-08`, `FR-09`):** Gom `OrdersController`, `OrdersService` cùng các thực thể liên quan đến đơn hàng (`Order`, `OrderItem`, `Promotion`), sản phẩm và người dùng. Xử lý luồng tạo đơn hàng (`POST /order/checkout`), cho phép khách hàng xem lịch sử đơn và nhân viên quầy cập nhật trạng thái đơn hàng.
* **PaymentsModule (`payments/` - `FR-07`):** Gom `PaymentsController`, `PaymentsService` và `MockPaymentService`; đăng ký các entity thanh toán (`Payment`), đơn hàng và người dùng. Mô phỏng cả 2 phương thức thanh toán gồm **Ví (sinh mã QR)** và **Thẻ (xác thực thông tin số thẻ, ngày hết hạn, mã bảo mật CVV/CVC)**, kiểm tra `Idempotency-Key` và trả kết quả giao dịch (`PAID` hoặc `PAYMENT_FAILED` / `PAY_FAIL`).
* **NguyenLieuModule (`NguyenLieu/` - `FR-10`, `FR-11`):** Giữ tên thư mục `NguyenLieu` theo quy ước hiện có trong repository. Quản lý định mức nguyên liệu và phục vụ chức năng lập hóa đơn nhập hàng dành riêng cho Quản lý (`POST /import-invoices`). Khi hóa đơn được lưu thành công, hệ thống sử dụng Database Transaction để tự động cộng dồn số lượng tồn kho tương ứng, tuyệt đối không cho phép chỉnh sửa tồn kho thủ công độc lập.

### 2.3. Cơ sở dữ liệu PostgreSQL, Cơ chế Migration và Transaction
Theo quyết định kiến trúc tại [ADR-003](./adr/003-database-migration.md), hệ thống quản lý dữ liệu trên PostgreSQL thông qua TypeORM với lộ trình và quy chuẩn rõ ràng:
* **Lưu trữ bền vững (Persistent Storage):** PostgreSQL lưu trữ toàn bộ các thực thể miền theo Class Diagram (Task 2.3) bao gồm: `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction` và nhóm thực thể quản lý kho `NguyenLieu`.
* **Lộ trình chuyển đổi sang TypeORM Migration & Seed (`database/`):**
  * Giải quyết lưu ý tại [ADR-002](./adr/002-layered-architecture.md) (việc `AppModule` bật `synchronize: true` ở giai đoạn phát triển ban đầu) bằng cách trích xuất lược đồ thành Initial Migration chuẩn và chuyển sang `synchronize: false` trên quy trình chuẩn và môi trường Production. Toàn bộ thay đổi lược đồ được quản lý qua các script chuẩn (`migration:generate`, `migration:run`, `migration:revert`, `seed:run`) cùng cấu hình `data-source.ts` độc lập.
  * Mỗi tệp migration gắn nhãn thời gian (`timestamp`), định nghĩa đầy đủ 2 chiều nâng cấp (`up`) – hoàn tác (`down`), tuân thủ quy tắc bất biến sau khi merge và thực thi an toàn trong từng giao dịch riêng (`migrationsTransactionMode: 'each'`) nhờ tính năng Transactional DDL của PostgreSQL.
  * Kịch bản `seeds/` nạp dữ liệu mẫu (menu đồ uống, size/topping, nguyên liệu, khuyến mãi, tài khoản test) giúp tái tạo 100% cơ sở dữ liệu khi chạy `docker-compose.yml` ở local và phục vụ kiểm thử tự động trên CI.
* **Đảm bảo toàn vẹn dữ liệu bằng PostgreSQL Transaction (ACID):**
  * Sử dụng `dataSource.transaction(...)` tại tầng Service cho luồng đặt đơn, cập nhật tồn kho và lập hóa đơn nhập hàng. Nếu bất kỳ điều kiện nghiệp vụ nào không thỏa mãn (như hết nguyên liệu, mã khuyến mãi hết lượt hoặc thanh toán thất bại), Service ném ra Exception và TypeORM tự động `ROLLBACK` toàn bộ các câu lệnh ghi trước đó.
  * Sử dụng `QueryRunner` kết hợp khóa bi quan (`pessimistic_write`) và cấu trúc `try ... catch ... finally` (bắt buộc gọi `await queryRunner.release()` trong `finally` để tránh rò rỉ kết nối) cho các thao tác có nguy cơ tranh chấp cao (Race Condition) như khi nhiều khách hàng cùng đặt phần nguyên liệu cuối cùng hoặc khi kiểm tra `Idempotency-Key`.

### 2.4. Dịch vụ Thanh toán Mô phỏng (Mock Payment Service)
Theo quyết định kiến trúc tại [ADR-004](./adr/004-payment-strategy.md), hệ thống sử dụng **Mock Payment Service nội bộ kết hợp Idempotency-Key** thay vì phụ thuộc vào cổng thanh toán bên thứ ba (như SePay/Momo/VNPay):
* **Hỗ trợ đa phương thức mô phỏng (Ví QR & Thẻ):** Cho phép giao diện Next.js hiển thị mã QR khi khách chọn thanh toán qua Ví hoặc biểu mẫu nhập thông tin thẻ (số thẻ, ngày hết hạn, mã CVV/CVC) khi khách chọn Thẻ, đồng thời hỗ trợ luồng khách đổi ý bấm "Quay lại" giỏ hàng trước khi hoàn tất thanh toán.
* **Loại bỏ sự phụ thuộc vào Public Webhook/Tunnel:** Giải quyết triệt để nút thắt phải cấu hình `ngrok` hoặc `localtunnel` cho 6 thành viên trong nhóm và trên pipeline CI/CD khi chạy kiểm thử tích hợp.
* **Chủ động kịch bản kiểm thử (Deterministic Testing):** Cho phép nhóm chủ động giả lập các phản hồi thành công (`Payment Success` -> cập nhật đơn sang `PAID` và trừ tồn kho) hoặc thất bại (`Payment Fail` -> hoàn tác tồn kho/điểm hoặc ghi nhận `PAYMENT_FAILED` / `PAY_FAIL`, trả về mã `BAD 400`) để kiểm thử toàn diện các nhánh rẽ trong Sequence Diagram (Task 2.2) mà không bị giới hạn lượt gọi (Rate Limit).
* **Xử lý Idempotency chống thanh toán lặp:** Khi nhận request `POST /order/checkout`, Backend truy vấn `Idempotency-Key` trong PostgreSQL. Nếu khóa đã tồn tại (do người dùng bấm thanh toán nhiều lần khi mạng lag), hệ thống bỏ qua bước thanh toán và trả về ngay kết quả của giao dịch trước đó mà không tạo thêm đơn hàng mới hay trừ điểm Loyalty lặp lại.

### 2.5. Logging, Health Check và Quản lý Cấu hình
Các mối quan tâm xuyên suốt (Cross-cutting Concerns) được định hướng chuẩn hóa như sau:
* **Logging:**
  * Thiết lập ghi nhật ký có cấu trúc (Structured Logging) tại tầng API cho các HTTP request/response (bao gồm method, đường dẫn, mã trạng thái HTTP và thời gian phản hồi tính bằng ms để giám sát mục tiêu **NFR-02** < 500ms).
  * Ghi log các ngoại lệ (Exception stack traces) và các sự kiện nghiệp vụ quan trọng (kiểm tra idempotency, tạo đơn, kết quả thanh toán, nhập kho). Tuyệt đối không ghi mật khẩu gốc hay chuỗi secret/JWT vào log (**NFR-03**).
* **Health Check:**
  * Chuẩn hóa endpoint `GET /health` tại Backend để kiểm tra trạng thái hoạt động của tiến trình NestJS và kết nối thực tế tới PostgreSQL.
  * Endpoint này phục vụ cấu hình `docker-compose.yml` và bước **Smoke Test** trong pipeline CI/CD (Task 5.3) nhằm xác nhận hệ thống hoạt động ổn định ngay sau khi chạy `migration:run` trên production, hoặc kích hoạt quy trình dừng pipeline và rollback (`migration:revert`) nếu thất bại.
* **Quản lý cấu hình (Configuration Management):**
  * Tách biệt hoàn toàn cấu hình nhạy cảm khỏi mã nguồn thông qua biến môi trường (`ConfigModule` / `ConfigService` và tệp `data-source.ts`), không ghi cứng (hardcode) tài khoản hay bí mật vào mã nguồn.
  * Kho mã nguồn chỉ lưu trữ tệp mẫu `.env.example` ở thư mục gốc của Monorepo, còn tệp `.env` thực tế bị loại trừ qua `.gitignore`.
  * Trên môi trường CI/CD và Production, các thông tin nhạy cảm được tiêm trực tiếp thông qua cơ chế **Secrets Management** của GitHub Actions và nền tảng Cloud triển khai; cơ sở dữ liệu production có persistent storage và nằm trong mạng nội bộ, không mở public trực tiếp ra ngoài.

---

## 3. Lý do Lựa chọn Kiến trúc, Ưu điểm, Hạn chế và Trade-off

### 3.1. Lý do lựa chọn kiến trúc (Rationale)
Nhóm lựa chọn kiến trúc **Modular Monolith kết hợp Phân lớp (Layered Architecture)** đặt trong **Monorepo** cùng cơ chế **TypeORM Migration & Transaction** vì:
* Tối ưu hóa tốc độ phối hợp cho nhóm 6 thành viên làm việc qua 2 Sprint ngắn hạn; mọi người có thể phân chia làm việc độc lập trên từng module (`auth`, `users`, `products`, `orders`, `payments`, `NguyenLieu`) và khởi chạy toàn bộ hệ thống chỉ với một cấu hình `docker-compose.yml` duy nhất.
* Đảm bảo tính truy vết (Traceability) chặt chẽ: mọi thay đổi từ tài liệu yêu cầu (`docs/requirements/`), sơ đồ (`docs/diagrams/`), kiến trúc (`docs/architecture/`), tệp lịch sử migration đến mã nguồn (`apps/`) và kiểm thử (`tests/`) đều nằm trong cùng một kho lưu trữ.
* Đảm bảo tính nhất quán dữ liệu tức thời (Strong Consistency) thông qua PostgreSQL Transaction cho chuỗi thao tác liên hoàn: kiểm tra `Idempotency-Key` -> khóa và trừ tồn kho -> áp dụng khuyến mãi/điểm -> tạo đơn và thanh toán.

### 3.2. Phân tích Ưu điểm, Hạn chế và Sự đánh đổi (Trade-offs)

| Quyết định Kiến trúc | Ưu điểm (Pros) | Hạn chế (Cons) | Sự đánh đổi (Trade-offs) |
| :--- | :--- | :--- | :--- |
| **Tổ chức mã nguồn Monorepo** ([ADR-001](./adr/001-monorepo.md)) | Đồng bộ `apps/web`, `apps/api`, `docs` và `tests` trong 1 repo; dễ dàng truy vết theo `traceability-matrix.md` và chạy toàn hệ thống bằng 1 file `docker-compose.yml`. | Kích thước repository lớn hơn so với Polyrepo; cần cấu hình nhánh và CI rõ ràng để tránh xung đột khi 6 thành viên cùng push code. | Đánh đổi việc quản lý phân quyền tách biệt từng repo con để lấy tốc độ phối hợp nhóm nhanh gọn và tính đồng bộ môi trường tuyệt đối. |
| **Kiến trúc phân lớp theo Module cho NestJS** ([ADR-002](./adr/002-layered-architecture.md)) | Ranh giới nghiệp vụ rõ ràng; luồng `Controller -> Service -> TypeORM/Repository` thống nhất; tận dụng tốt Dependency Injection của NestJS và triển khai đơn giản chỉ với 1 ứng dụng backend. | Các module dùng chung tiến trình và DB; phụ thuộc chéo nếu không kiểm soát `exports` sẽ làm mờ ranh giới module; không thể scale riêng lẻ từng domain như Microservices. | Chấp nhận giới hạn về khả năng scale độc lập và sự phụ thuộc trực tiếp vào TypeORM (không dùng Clean Architecture thuần túy) để đổi lấy tốc độ phát triển MVP nhanh và dễ bảo trì. |
| **TypeORM Migration & PostgreSQL Transaction** ([ADR-003](./adr/003-database-migration.md)) | Tái tạo DB 100% ở mọi môi trường qua Migration & Seed; hỗ trợ rollback schema an toàn trên CD; chống sai lệch tồn kho và điểm thưởng nhờ ACID Transaction & khóa `pessimistic_write`. | Thành viên bắt buộc phải sinh file migration khi sửa Entity; việc khóa dòng dữ liệu làm các request trùng thời điểm phải xếp hàng chờ nhau trong thời gian ngắn. | Đánh đổi sự tiện lợi tức thời của `synchronize: true` và một phần nhỏ độ trễ khi tranh chấp khóa để ưu tiên tuyệt đối tính toàn vẹn dữ liệu giao dịch và khả năng rollback trên Production. |
| **Mock Payment Service & Idempotency** ([ADR-004](./adr/004-payment-strategy.md)) | Tự chủ 100% luồng dữ liệu Ví QR & Thẻ; chống tạo đơn trùng khi mạng lag; dễ dàng ép lỗi để chạy Integration/E2E test ổn định trên CI mà không cần mở port public (`ngrok`). | Không thực hiện trừ tiền tài khoản ngân hàng thực tế như khi tích hợp cổng SePay/VNPay thật. | Đánh đổi giao dịch ngân hàng thật để lấy sự ổn định tuyệt đối cho môi trường Local/CI, kiểm thử tự động và đảm bảo tính toàn vẹn dữ liệu giao dịch. |
| **Xác thực Stateless bằng JWT** | Backend không cần lưu trữ trạng thái phiên (session) trong bộ nhớ; dễ dàng tích hợp giữa Next.js PWA và NestJS API qua Header `Bearer JWT`. | Khó thu hồi (revoke) một token ngay lập tức phía server trước khi token hết hạn nếu không dùng thêm Redis Blacklist. | Đặt thời gian sống (TTL) hợp lý cho JWT và xóa token phía client khi đăng xuất (`FR-05`) để không làm phức tạp hóa hạ tầng với Redis trong MVP. |

---

## 4. Danh mục Quyết định Kiến trúc (ADR)

Các quyết định kiến trúc trọng tâm của dự án được ghi nhận chi tiết thành từng tệp độc lập trong thư mục `docs/architecture/adr/` để phục vụ việc kiểm soát phiên bản và truy vết:

* **[ADR-001: Tổ chức mã nguồn dự án theo cấu trúc Monorepo](./adr/001-monorepo.md)**
  * *Tóm tắt quyết định:* Lựa chọn cấu trúc Monorepo tiêu chuẩn (gom `apps/web`, `apps/api`, `docs/`, `tests/` vào một kho Git duy nhất) thay vì Polyrepo nhằm đảm bảo tính truy vết xuyên suốt, giúp 6 thành viên phối hợp nhanh qua 2 Sprint và khởi chạy đồng bộ bằng một tệp `docker-compose.yml`.
* **[ADR-002: Quyết định chọn kiến trúc phân lớp theo module cho NestJS](./adr/002-layered-architecture.md)**
  * *Tóm tắt quyết định:* Lựa chọn kiến trúc Modular Monolith kết hợp phân lớp (`Controller -> Service -> TypeORM/Repository`) chia theo các module nghiệp vụ (`auth`, `users`, `products`, `orders`, `payments`, `NguyenLieu`) thay vì gom tầng toàn cục hoặc chia Microservices, giúp tách biệt trách nhiệm rõ ràng, giảm xung đột khi làm việc nhóm và đơn giản hóa việc triển khai MVP.
* **[ADR-003: Quyết định quản lý lược đồ bằng TypeORM Migration và xử lý giao dịch (Transaction) cho PostgreSQL](./adr/003-database-migration.md)**
  * *Tóm tắt quyết định:* Chuyển đổi từ `synchronize: true` sang quản lý lịch sử lược đồ bằng TypeORM Migration (`up`/`down`) kết hợp Seed data phục vụ CI/CD và Rollback; đồng thời sử dụng PostgreSQL Transaction (`dataSource.transaction` và `QueryRunner` với khóa `pessimistic_write`) tại tầng Service để bảo toàn tính toàn vẹn dữ liệu (ACID) khi kiểm tra `Idempotency-Key`, tạo đơn hàng, trừ tồn kho và tính điểm thưởng.
* **[ADR-004: Quyết định cơ chế Thanh toán mô phỏng và xử lý Idempotency](./adr/004-payment-strategy.md)**
  * *Tóm tắt quyết định:* Lựa chọn xây dựng `MockPaymentService` nội bộ (mô phỏng Ví QR và Thẻ) kết hợp cơ chế kiểm tra `Idempotency-Key` trên PostgreSQL thay vì gọi cổng thanh toán bên thứ ba (SePay), giúp chống tạo đơn trùng khi mạng chập chờn và loại bỏ sự phụ thuộc vào `ngrok` webhook khi chạy Integration Test trên CI/CD.

---

**BrewLite – Đồ án Công nghệ Phần mềm | Nhóm 12**