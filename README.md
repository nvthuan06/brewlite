# BrewLite – Coffee Shop Management System

BrewLite là đồ án học phần **Công nghệ Phần mềm**, xây dựng hệ thống bán hàng và quản lý đơn hàng cho cửa hàng cà phê.

## Thông tin đồ án

- **Học phần:** Công nghệ Phần mềm
- **Giảng viên hướng dẫn:** Từ Lãng Phiêu
- **Nhóm:** 12

| STT | Họ và tên | MSSV |
| --- | --- | --- |
| 1 | Vãn Nguyễn Đức Thịnh | 3124410344 |
| 2 | Nguyễn Vũ Thuần | 3124410347 |
| 3 | Nguyễn Triệu Thiên | 3124410335 |
| 4 | Trần Diệu Vi | 3124410402 |
| 5 | Lâm Thái Thuận | 3124410346 |
| 6 | Ngô Đông Ất | 3123410014 |

# BrewLite — Docker Compose local & Unit Test

## 1. Yêu cầu trước khi chạy

- Windows 11 và **Docker Desktop** chạy **Linux containers** bằng WSL 2.
- Docker Compose V2 (`docker compose`, có dấu cách).
- Bật **Virtualization** trong BIOS/UEFI (nếu đang tắt); nên có từ 8 GB RAM.
- Node.js 24 LTS (ít nhất 24.15.0 theo cấu hình được yêu cầu cho dự án) khi chạy Vitest *trực tiếp trên Windows*; không cần cài Node.js trên Windows nếu chỉ chạy các service qua Docker.

### 1.1. Cài WSL 2 (chỉ khi chưa có)

Mở **PowerShell với quyền Administrator**, kiểm tra:

```powershell
wsl --version
wsl --status
```

Nếu WSL chưa được cài, chạy:

```powershell
wsl --install
```

Nếu đã cài nhưng phiên bản cũ, cập nhật:

```powershell
wsl --update
```

Khởi động lại Windows nếu được yêu cầu. Tham khảo hướng dẫn chính thức của Microsoft: https://learn.microsoft.com/windows/wsl/install

### 1.2. Cài Docker Desktop

1. Truy cập trang chính thức: https://docs.docker.com/desktop/setup/install/windows-install/
2. Tải **Docker Desktop for Windows** phù hợp với CPU (thông thường là x86_64).
3. Chạy trình cài đặt, chọn backend **WSL 2**; dùng Linux containers cho dự án này.
4. Mở **Docker Desktop** và chờ Docker Engine sẵn sàng.
5. Kiểm tra trong PowerShell:

```powershell
docker --version
docker compose version
docker info
```

Có thể kiểm tra thêm bằng:

```powershell
docker run --rm hello-world
```

**Lưu ý:** Docker Desktop phải đang chạy trước khi gọi `docker compose`. Nếu gặp lỗi `dockerDesktopLinuxEngine` hoặc không kết nối được daemon, hãy mở Docker Desktop rồi kiểm tra lại `docker info`. Không cần đăng nhập Docker Hub để chạy các image public trong trường hợp thông thường, nhưng việc tải image ban đầu cần Internet.

## 2. Khởi động 3 service bằng Docker Compose

Mở PowerShell tại **thư mục gốc dự án** (ví dụ `D:\brewlite`):

```powershell
cd D:\brewlite
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose config
docker compose up --build -d
docker compose ps
```

Nếu muốn xem log trực tiếp:

```powershell
docker compose logs -f api
```

Ba service được cấu hình chờ nhau qua healthcheck theo thứ tự: `database` → `api` → `web`.

| Service | Truy cập từ máy Windows | Kết nối giữa các container |
| --- | --- | --- |
| Web (Next.js) | http://localhost:3000 | `web:3000` |
| API (NestJS) | http://localhost:3001 | `api:3001` |
| Swagger | http://localhost:3001/api | — |
| API Health | http://localhost:3001/health | `http://api:3001/health` |
| PostgreSQL | `localhost:5433` | `database:5432` |

Tài khoản PostgreSQL mặc định trong `.env.example`: user `brewlite`, database `brewlite`. Các thông tin này chỉ dùng cho **local development**. Không commit `.env` hay mật khẩu vào Git.

Dữ liệu PostgreSQL được lưu trong **named volume**; `docker compose down` thông thường không xóa dữ liệu. Khi database chưa có sản phẩm, `ProductsService` có thể tự thêm sản phẩm mẫu theo logic hiện tại của ứng dụng.

### 2.1. Kiểm tra hệ thống

```powershell
docker compose ps
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
Invoke-WebRequest http://localhost:3001/health -UseBasicParsing
```

Nếu repository có script smoke test:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke-test.ps1
```

`Healthy` nghĩa là container đạt healthcheck đã cấu hình; vẫn nên kiểm tra luồng Web → API → Database bằng thao tác tạo tài khoản, đăng nhập hoặc tạo đơn hàng.

## 3. Quan trọng: Trùng cổng với dự án CONGNGHEPHANMEM cũ

Trên cùng máy có thể còn nhóm container Docker Compose **`congnghephanmem`** từ phiên bản chạy trước đó. Trong trường hợp đã gặp ở môi trường local:

| Container cũ | Cổng Windows đang sử dụng | Có thể xung đột với BrewLite mới |
| --- | --- | --- |
| `congnghephanmem-frontend-1` | `3000` | Web mới `3000` |
| `congnghephanmem-backend-1` | `3001` | API mới `3001` |
| `congnghephanmem-db-1` | `5432` nội bộ (không publish ra Windows trong lần kiểm tra) | Không trùng với `localhost:5433` nếu vẫn cấu hình như vậy |
| `congnghephanmem-tunnel-1` | Không publish cổng trong lần kiểm tra | Không trực tiếp chiếm 3000/3001 |

Một cổng host, ví dụ `0.0.0.0:3001`, không thể được hai container publish đồng thời. `127.0.0.1:3001` cũng không tránh được xung đột nếu container cũ đã bind `0.0.0.0:3001`.

**Kiểm tra container chiếm cổng:**

```powershell
docker ps --format "table {{.Names}}\t{{.Ports}}"
docker ps --filter "publish=3000"
docker ps --filter "publish=3001"
```

**Cách A — Dừng Web và API cũ, giữ cổng mặc định cho BrewLite mới.** Chỉ thực hiện nếu bạn không cần các dịch vụ cũ đang hoạt động:

```powershell
docker stop congnghephanmem-frontend-1 congnghephanmem-backend-1
cd D:\brewlite
docker compose up -d
docker compose ps
```

`docker stop` có thể chạy từ bất cứ thư mục nào; lệnh này không xóa container hay volume. Nếu cần dừng toàn bộ nhóm cũ, có thể dừng thêm `congnghephanmem-tunnel-1` và `congnghephanmem-db-1`, nhưng sẽ khiến ứng dụng cũ ngừng hoạt động. **Không dùng `docker compose down -v` để giải quyết xung đột cổng**, vì có nguy cơ xóa dữ liệu PostgreSQL của dự án tương ứng.

**Cách B — Chạy cả hai bộ song song bằng cổng host khác nhau.** Sửa file `D:\brewlite\.env` (nếu cấu hình Compose của repository sử dụng các biến dưới đây):

```dotenv
WEB_PORT=3002
API_PORT=3003
DB_HOST_PORT=5433
```

Kiểm tra `docker compose config` để xác nhận `ports:` đã ánh xạ như dự kiến, rồi chạy:

```powershell
cd D:\brewlite
docker compose config
docker compose up --build -d
docker compose ps
```

Khi đó, địa chỉ truy cập BrewLite mới sẽ là Web `http://localhost:3002`, API `http://localhost:3003`, Health `http://localhost:3003/health`. Trong mạng Docker, service API vẫn có thể là `api:3001`, PostgreSQL vẫn là `database:5432`.

**Rất quan trọng:** Nếu đổi API host port sang `3003`, cần bảo đảm URL API mà **trình duyệt** sử dụng là `http://localhost:3003` (ví dụ `NEXT_PUBLIC_API_URL`) và cấu hình CORS cho phép origin `http://localhost:3002`. Vì biến `NEXT_PUBLIC_*` của Next.js có thể được nhúng tại lúc build, dùng `docker compose up --build -d` sau khi sửa cấu hình. Nếu Web không kết nối API, kiểm tra cả `docker compose config` và cấu hình frontend; không mặc định rằng chỉ thay `.env` sẽ đủ với mọi phiên bản mã nguồn.

**Phân biệt:**

- `docker stop <tên-container>`: Dừng container cụ thể từ bất cứ thư mục nào.
- `docker compose up/down`: Quản lý **dự án Compose ứng với file cấu hình ở thư mục hiện tại** (hoặc file được chỉ định bằng `-f`).
- Không kill `com.docker.backend.exe` bằng `Stop-Process` khi gặp xung đột cổng; đó là thành phần Docker Desktop. Hãy tìm container đang publish cổng bằng `docker ps`.

## 4. Unit Test và Test Coverage (Vitest)

Unit test nằm tại `apps/api/src/**/*.spec.ts`, sử dụng mock, không yêu cầu PostgreSQL hay Docker nếu chạy trực tiếp trên Windows:

```powershell
cd D:\brewlite\apps\api
npm ci
npm test
npm run test:cov
```

Hoặc chạy trong API image đã build (nếu image có các dev dependencies của Vitest):

```powershell
cd D:\brewlite
docker compose run --rm --no-deps api npm test
docker compose run --rm --no-deps api npm run test:cov
```

`npm test` là unit test; `scripts/smoke-test.ps1` là smoke test cho môi trường đang chạy. Bộ kiểm thử E2E (`npm run test:e2e`) có thể yêu cầu cấu hình hoặc dữ liệu tích hợp riêng.

**Coverage ghi nhận gần nhất trong báo cáo của nhóm:**

| Chỉ số | Coverage |
| --- | ---: |
| Statements | 93,62% |
| Branches | 84,32% |
| Functions | 74,71% |
| Lines | 96,68% |

Số liệu này là kết quả báo cáo tại thời điểm kiểm thử, không thay thế việc chạy lại test sau khi thay đổi code.

## 5. Lệnh Docker thường dùng và xử lý lỗi

```powershell
# Trạng thái toàn bộ container đang chạy
docker ps

# Trạng thái (kể cả container đã thoát) thuộc dự án BrewLite hiện tại
docker compose ps -a

# Log 3 service
docker compose logs --tail=100 database api web

# Chạy lại các service
docker compose up -d

# Build lại sau khi thay đổi code hoặc dependency
docker compose up --build -d

# Dừng và xóa container/network của dự án hiện tại, GIỮ volume database
docker compose down
```

| Lỗi | Hướng xử lý |
| --- | --- |
| `dockerDesktopLinuxEngine`, cannot connect to daemon | Mở Docker Desktop, chờ Engine chạy, kiểm tra `docker info` |
| `port is already allocated`, `bind ... 3000/3001 failed` | Kiểm tra `docker ps`, dừng container cũ hoặc thay host ports trong `.env` |
| `Missing script: "dev"` ở API | Kiểm tra script thực tế ở `apps/api/package.json`; API trong cấu hình đã dùng `npm run start:dev` |
| `Missing script: "start:dev"` ở Web | Next.js Web chạy `npm run dev`, không phải `start:dev` |
| `Container ... exited (1)` | Xem `docker compose logs <service> --tail=100` |
| Web/ API đang `health: starting` | Chờ healthcheck hoàn tất và kiểm tra lại `docker compose ps`; xem log nếu chuyển `unhealthy` |
| Web gọi API lỗi | Kiểm tra host port, `NEXT_PUBLIC_API_URL`, CORS, rebuild Web khi đổi build-time env |

**Chỉ dùng khi thực sự muốn xóa sạch database local:**

```powershell
docker compose down -v
```

Lệnh này xóa cả named volume được Compose quản lý nên có thể làm **mất dữ liệu PostgreSQL**.

## 6. Ghi chú kỹ thuật

- API kết nối database với `DB_HOST=database`, **không phải** `localhost` bên trong container.
- Browser trên Windows gọi API qua `http://localhost:<API_PORT>`, không dùng `http://api:3001` vì hostname `api` chỉ được DNS nội bộ Docker phân giải.
- PostgreSQL nội bộ dùng `database:5432`; cổng Windows mặc định là `5433` để tránh xung đột PostgreSQL cài trên máy.
- Local dùng development servers trong image; thư mục mã nguồn không được bind mount nên thay đổi code cần rebuild image.
- TypeORM `synchronize: true` chỉ phù hợp cho môi trường development; production cần quản lý migrations.
- Chưa cấu hình nhà cung cấp thanh toán/webhook thực tế; smoke test chỉ xác nhận các endpoint và kết nối local được kiểm tra.
- Build image lần đầu cần Internet để tải package; một số font Next.js cũng có thể yêu cầu truy cập Google Fonts.

### Tài liệu chính thức

- [Docker Desktop — Windows installation](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Docker Desktop — WSL2 backend](https://docs.docker.com/desktop/features/wsl/)
- [Microsoft — Install WSL](https://learn.microsoft.com/windows/wsl/install)
