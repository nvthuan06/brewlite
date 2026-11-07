# ADR-001: Tổ chức mã nguồn dự án theo cấu trúc Monorepo

- **Trạng thái (Status):** Accepted
- **Ngày quyết định (Date):** 07/11/2026
- **Người đề xuất & phê duyệt (Deciders):** Nhóm phát triển dự án BrewLite
- **Liên kết yêu cầu/Task:** Task 3.1 (Thiết kế kiến trúc), Task 4.1 (Thiết lập repository), Task 8.1 (Ma trận truy vết)

---

## 1. Bối cảnh và Vấn đề

Dự án **BrewLite** là một hệ thống đặt đồ uống trực tuyến bao gồm nhiều thành phần kỹ thuật và tạo phẩm khác nhau:

- **Frontend:** Ứng dụng web theo hướng mobile-first/PWA xây dựng bằng **Next.js**.
- **Backend:** RESTful API xây dựng bằng **NestJS** kết nối cơ sở dữ liệu **PostgreSQL**.
- **Tài liệu kỹ thuật:** Tài liệu đặc tả yêu cầu (SRS), sơ đồ UML (Activity, Sequence, Class, Deployment), các quyết định kiến trúc và ma trận truy vết (`traceability-matrix.md`).
- **Hạ tầng & Kiểm thử:** Cấu hình `docker-compose.yml` cho môi trường local, bộ kiểm thử tích hợp/E2E (`tests/`) và pipeline CI/CD (`.github/workflows/`).

**Vấn đề đặt ra:** Với quy mô nhóm 6 thành viên làm việc qua 2 Sprint ngắn hạn, nhóm cần chọn một chiến lược tổ chức kho mã nguồn sao cho dễ dàng tổ chức, đảm bảo tính nhất quán và dễ dàng chạy trên máy, thiết lập pipe CI/CD

---

## 2. Các yếu tố thúc đẩy quyết định

- **Tính truy vết:** Mọi thay đổi về yêu cầu, sơ đồ thiết kế hoặc kiến trúc phải được push lên ghi rõ comment và khớp với mã nguồn thực thi.
- **Tính tốc độ trong phối hợp nhóm:** Có thể pull về sửa code, hỗ trợ mọi người trong nhóm 1 cách nhanh gọn.
- **Tính đồng bộ của môi trường:** Một người không thuộc nhóm có thể `git clone` dự án và khởi chạy toàn bộ hệ thống chỉ bằng một cấu hình `docker-compose.yml` duy nhất.

---

## 3. Các phương án đã cân nhắc

1. **Phương án 1: Polyrepo (Multi-repo)** – Tách thành các repository độc lập (ví dụ: `brewlite-web`, `brewlite-api`, `brewlite-docs`).
2. **Phương án 2: Monorepo tiêu chuẩn** – Gom toàn bộ ứng dụng (`apps/web`, `apps/api`), tài liệu (`docs/`) và kiểm thử (`tests/`) vào một kho lưu trữ Git duy nhất.

## 4. Quyết định (Decision Outcome)

Nhóm quyết định chọn **Phương án 2: Tổ chức mã nguồn theo cấu trúc Monorepo**.

Toàn bộ dự án BrewLite được quản lý trong một repository duy nhất tuân thủ cấu trúc thư mục sau:

```text
brewlite/
├── apps/
│   ├── web/                  # Ứng dụng Frontend (Next.js mobile-first/PWA)
│   └── api/                  # Ứng dụng Backend (NestJS REST API)
├── docs/
│   ├── requirements/         # Tài liệu bối cảnh, phạm vi, SRS, đặc tả Use-case (Task 1)
│   ├── diagrams/             # Nguồn PlantUML (.puml) và ảnh kết xuất (.svg/.png) (Task 2)
│   ├── architecture/         # Tài liệu kiến trúc, ADR và Deployment diagram (Task 3)
│   ├── traceability-matrix.md
│   └── deployment.md
├── tests/                    # Kiểm thử tích hợp (Integration) và End-to-End (E2E)
├── .github/workflows/        # Cấu hình pipeline CI/CD (GitHub Actions)
├── docker-compose.yml        # Khởi chạy đồng thời Web, API và PostgreSQL ở local
├── .env.example              # Mẫu biến môi trường cho toàn hệ thống
└── README.md                 # Hướng dẫn cài đặt, chạy thử, kiểm thử và triển khai
```
