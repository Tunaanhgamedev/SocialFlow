# SocialFlow – Automated Multi-Platform Social Media Manager

> Hệ thống tự động hóa tiếp nhận video Douyin có bản quyền, xử lý định dạng 9:16 bằng FFmpeg, tạo metadata bằng AI, kiểm duyệt nội dung và tự động xuất bản lên Facebook Reels (Page & Profile).

---

## 🏗️ Kiến trúc Tổng thể (Phase 1 Foundation)

Hệ thống được tổ chức theo mô hình **Monorepo** với `pnpm workspaces`:

```
SocialFlow/
├── apps/
│   ├── web/           # React 18 + TypeScript + Vite + Tailwind CSS (Dashboard Quản lý)
│   ├── api/           # Node.js + Express + TypeScript (REST API Backend)
│   └── worker/        # BullMQ Background Workers (Download, FFmpeg, AI, Publish)
├── packages/
│   ├── database/      # PostgreSQL + Prisma ORM (Schema 7 nhóm nghiệp vụ & Client)
│   └── shared/        # Shared Types, Enums, Zod Validators
├── storage/           # Local Filesystem Storage (raw, processed, thumbnails)
├── docker-compose.yml # PostgreSQL 17 + Redis 7
├── pnpm-workspace.yaml
└── .env
```

---

## 🚀 Các bước cài đặt & Khởi chạy trên Windows

### 1. Cài đặt các gói phụ thuộc (Dependencies)
Mở PowerShell tại thư mục dự án và chạy:
```powershell
pnpm install
```

### 2. Khởi tạo Cơ sở Dữ liệu & Prisma Client
Sinh Prisma Client và đồng bộ schema vào PostgreSQL:
```powershell
# Sinh mã nguồn TypeScript cho Prisma Client
pnpm db:generate

# Đẩy schema lên database PostgreSQL (hoặc chạy migrate)
pnpm db:push
```

### 3. Khởi động PostgreSQL & Redis
Bạn có thể lựa chọn 1 trong 2 cách:

#### Cách A: Sử dụng Docker Compose (Khuyên dùng)
```powershell
docker compose up -d
```

#### Cách B: Sử dụng PostgreSQL có sẵn trên máy
Nếu bạn đã cài PostgreSQL tại `E:\PostpreSQL`, khởi động server:
```powershell
& "E:\PostpreSQL\bin\pg_ctl.exe" start -D "E:\PostpreSQL\data" -l "E:\PostpreSQL\logfile.log"
```

> **Lưu ý về Redis:** Nếu chưa chạy Redis, API và Dashboard vẫn hoạt động bình thường ở chế độ *Standby Mode*.

### 4. Khởi chạy Hệ thống Development
Khởi chạy đồng thời cả Backend API và Frontend Dashboard:
```powershell
pnpm dev
```

Hoặc chạy từng thành phần riêng biệt:
- **Backend API (Port 3000):**
  ```powershell
  pnpm dev:api
  ```
- **Frontend Dashboard (Port 5173):**
  ```powershell
  pnpm dev:web
  ```
- **Background Worker:**
  ```powershell
  pnpm dev:worker
  ```

---

## 🌐 Các cổng & Đường dẫn truy cập

- **Frontend Dashboard:** [http://localhost:5173](http://localhost:5173)
- **API Health Check:** [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **API Base URL:** [http://localhost:3000/api/v1](http://localhost:3000/api/v1)

---

## 📋 Kiểm tra Tiêu chuẩn Hoàn thành Phase 1 (Verification Checklist)

Chạy kiểm tra toàn bộ typecheck và build của Monorepo:
```powershell
# Kiểm tra TypeScript typecheck toàn bộ workspace
pnpm typecheck

# Build toàn bộ packages và apps
pnpm build
```

---

## 🔒 Bản quyền & Quyền sử dụng nội dung (Rights & Compliance)
Hệ thống được thiết kế với cơ chế bắt buộc: mọi video đưa vào xuất bản phải có trường `rightsStatus: AUTHORIZED`. Trạng thái `PENDING_REVIEW` sẽ bị chặn ở bước lập lịch xuất bản cho đến khi người quản trị kiểm duyệt và bấm **Duyệt Video**.
