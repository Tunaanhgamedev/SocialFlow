# ⚡ SocialFlow – Automated Multi-Platform Social Media Manager

[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-cyan.svg)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19+-indigo.svg)](https://www.prisma.io/)
[![Architecture](https://img.shields.io/badge/Architecture-Monorepo%20(pnpm)-orange.svg)](https://pnpm.io/)

> **SocialFlow** là hệ thống tự động hóa toàn diện quy trình tiếp nhận video nguồn (Douyin, URL, thư mục máy tính), kiểm duyệt quyền tác quyền (Digital Rights Management), chuẩn hóa video chuẩn tỷ lệ 9:16 bằng FFmpeg, sinh tiêu đề & caption bằng AI, và lập lịch tự động xuất bản lên **Facebook Reels** (hỗ trợ mở rộng TikTok, YouTube Shorts, Instagram Reels).

---

## 🌟 Tính Năng Nổi Bật (Highlights)

### 1. Khởi chạy 1-Click trên Windows
- Không cần mở terminal hay gõ lệnh: Nhấp đúp vào file `CHAY_SOCIALFLOW.bat` (hoặc `START.bat`).
- Tự động kiểm tra môi trường, giải phóng cổng bận (3000 & 5173), bật PostgreSQL, đồng bộ database, và **tự động mở trình duyệt đến Dashboard `http://localhost:5173`**.
- Hỗ trợ tạo shortcut ngoài màn hình chính chỉ với 1 click qua `Tao_Shortcut_Desktop.bat`.

### 2. Quản Lý Nguồn & Tiếp Nhận Video (Phase 2)
- **Import qua URL**: Tiếp nhận link Douyin hoặc URL trực tiếp, tự động lưu thông tin tác giả, tiêu đề, và chứng từ cấp quyền.
- **Upload Video Đa File**: Hỗ trợ kéo thả nhiều video (`.mp4`, `.mov`, `.webm`, `.mkv`), dung lượng tối đa 500MB/file.
- **Folder Watcher thời gian thực**: Sử dụng `Chokidar` tự động quét và nạp video mới xuất hiện trong các thư mục máy tính được chỉ định.
- **Deduplication bằng SHA-256**: Băm mã hash nội dung file ngay khi nạp để loại bỏ hoàn toàn các video trùng lặp.
- **Trích xuất Metadata & Thumbnail tự động**: Tích hợp `ffprobe` và `ffmpeg` trích xuất thông số kỹ thuật (độ phân giải, thời lượng, bitrate, codec, tỷ lệ 9:16) và chụp ảnh bìa tự động tại giây thứ 1.

### 3. Chiến Lược Lưu Trữ "Local Trước – Cloud Sau"
- Thiết kế theo chuẩn **Storage Provider Pattern** với interface `IStorageProvider`:
  - Hiện tại: **`LocalStorageProvider`** lưu trữ có tổ chức trên ổ cứng máy tính (`storage/originals/`, `storage/processed/`, `storage/thumbnails/`, `storage/temp/`), không phát sinh chi phí Cloud.
  - Tương lai: **`CloudStorageProvider`** chuyển đổi mượt mà sang Amazon S3, Cloudflare R2, hoặc Supabase Storage chỉ bằng cách đổi biến môi trường, không cần viết lại logic nghiệp vụ.
- **Quy tắc bất biến**: Cơ sở dữ liệu chỉ lưu `storageProvider` và `storageKey` tương đối (ví dụ `originals/173000_sample.mp4`), tuyệt đối không lưu đường dẫn ổ đĩa cố định.

### 4. Kiểm Soát Quyền Bản Quyền (Rights Management)
- Hệ thống phân loại quyền chặt chẽ: `AUTHORIZED`, `LICENSED`, `PENDING_REVIEW`, `PROHIBITED`, `REVOKED`, `PUBLIC_DOMAIN`.
- Cơ chế kiểm duyệt nghiêm ngặt: Tự động cảnh báo và ngăn chặn xuất bản các video chưa có giấy phép hoặc sự đồng ý của tác giả.

### 5. Thư Viện Video (Video Library UI)
- Giao diện trực quan hỗ trợ cả 2 chế độ hiển thị: **Lưới (Grid)** và **Danh sách (List)**.
- Bộ lọc nâng cao theo trạng thái xử lý, quyền sở hữu, tìm kiếm từ khóa, và sắp xếp theo dung lượng, thời lượng, thời gian.
- Tích hợp trình xem video **HTML5 Video Player** hỗ trợ stream chuẩn **HTTP 206 Partial Content**.

---

## 🏗️ Cấu Trúc Dự Án (Monorepo)

```text
SocialFlow/
├── apps/
│   ├── web/               # React 18 + TypeScript + Vite + Tailwind CSS (Dashboard)
│   ├── api/               # Express + TypeScript REST API (Điều phối nghiệp vụ & Streaming)
│   └── worker/            # BullMQ Workers (Hàng đợi xử lý FFmpeg & AI ngầm)
├── packages/
│   ├── database/          # PostgreSQL + Prisma ORM v6 (Schema 7 nhóm nghiệp vụ & Client)
│   └── shared/            # Shared Types, DTOs, Enums, Zod Validators
├── storage/               # Phân vùng lưu trữ dữ liệu
│   ├── originals/         # Video gốc sau khi tải lên / tiếp nhận
│   ├── processed/         # Video đã chuẩn hóa 9:16 qua FFmpeg
│   ├── thumbnails/        # Ảnh bìa trích xuất tự động
│   └── temp/              # File tạm trong quá trình xử lý
├── scripts/               # Các script tiện ích hệ thống
├── CHAY_SOCIALFLOW.bat    # File 1-Click khởi chạy toàn bộ hệ thống
├── START.bat              # Alias khởi chạy nhanh
├── Tao_Shortcut_Desktop.bat # Tạo lối tắt trên màn hình máy tính
├── DUNG_SOCIALFLOW.bat    # Dọn dẹp và dừng các tiến trình chạy nền
├── docker-compose.yml     # PostgreSQL + Redis Container (Tùy chọn)
└── pnpm-workspace.yaml    # Cấu hình monorepo
```

---

## 🚀 Hướng Dẫn Sử Dụng Nhanh

### Cách 1: Sử dụng bộ công cụ 1-Click (Khuyên dùng trên Windows)
1. Nhấp đúp vào **`Tao_Shortcut_Desktop.bat`** để tạo biểu tượng **SocialFlow** ngoài màn hình Desktop (chỉ làm lần đầu).
2. Nhấp đúp vào biểu tượng **SocialFlow** ngoài Desktop (hoặc file **`CHAY_SOCIALFLOW.bat`**).
3. Ứng dụng sẽ tự khởi động và tự động mở trình duyệt tới địa chỉ: **[http://localhost:5173](http://localhost:5173)**.
4. Khi muốn tắt hoàn toàn hệ thống: Nhấp đúp vào **`DUNG_SOCIALFLOW.bat`**.

---

### Cách 2: Khởi chạy bằng dòng lệnh (Dành cho Lập trình viên)

#### 1. Cài đặt Dependencies
```powershell
pnpm install
```

#### 2. Cấu hình Biến Môi trường
Sao chép `.env.example` thành `.env` và cập nhật thông tin kết nối PostgreSQL:
```env
PORT=3000
APP_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socialflow?schema=public
STORAGE_PROVIDER=LOCAL
STORAGE_LOCAL_ROOT=./storage
```

#### 3. Đồng bộ Database & Prisma Client
```powershell
pnpm db:generate
pnpm db:push
```

#### 4. Khởi chạy Development Server
```powershell
# Chạy đồng thời cả Backend API và Frontend Dashboard
pnpm dev

# Hoặc chạy riêng từng phân hệ:
pnpm dev:api      # Backend API trên port 3000
pnpm dev:web      # Web Dashboard trên port 5173
pnpm dev:worker   # Background Worker xử lý hàng đợi
```

#### 5. Kiểm tra & Build Monorepo
```powershell
pnpm typecheck    # Kiểm tra kiểu dữ liệu toàn bộ workspace
pnpm build        # Build toàn bộ packages và applications
```

---

## 📡 Danh Mục API Endpoints Chính

| Phương thức | Đường dẫn | Chức năng |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Kiểm tra tình trạng sức khỏe hệ thống (DB, Storage, Redis) |
| `POST` | `/api/v1/videos/upload` | Upload nhiều file video lên máy chủ (hỗ trợ phân loại quyền) |
| `GET` | `/api/v1/videos` | Danh sách video có phân trang, tìm kiếm, lọc và sắp xếp |
| `GET` | `/api/v1/videos/:id` | Chi tiết metadata, tài sản và quyền sở hữu của video |
| `GET` | `/api/v1/videos/:id/stream` | Stream nội dung video (HTTP 206 Range) |
| `GET` | `/api/v1/videos/:id/thumbnail`| Lấy ảnh thumbnail của video |
| `DELETE`| `/api/v1/videos/:id` | Xóa video và toàn bộ tệp tin liên quan trên ổ đĩa |
| `POST` | `/api/v1/sources/douyin` | Tiếp nhận và nạp video từ URL Douyin |
| `POST` | `/api/v1/rights/:videoId` | Cập nhật quyền sở hữu và chứng từ cấp phép bản quyền |
| `POST` | `/api/v1/folders/watch` | Đăng ký theo dõi tự động thư mục video trên máy tính |
| `POST` | `/api/v1/folders/scan` | Quét tức thì các video mới trong thư mục chỉ định |

---

## 🗺️ Lộ Trình Phát Triển (Roadmap)

- [x] **Phase 1: Architecture & Foundation**
  - Khởi tạo Monorepo pnpm workspaces, thiết kế kiến trúc 6 module, cấu hình TypeScript, Tailwind, Prisma schema 7 nhóm thực thể.
- [x] **Phase 2: Source & Video Management**
  - Xây dựng Video Library UI, tiếp nhận URL Douyin, upload đa file, Folder Watcher Chokidar, kiểm duyệt quyền sở hữu, trích xuất metadata với FFmpeg/FFprobe, kiến trúc Storage Provider Pattern "Local trước - Cloud sau", bộ launcher 1-Click trên Windows.
- [ ] **Phase 3: Video Processing Engine (Tiếp theo)**
  - Tự động chuẩn hóa video tỷ lệ 9:16 (1080x1920) với nền mờ / crop thông minh.
  - Cắt gọt đầu đuôi, căn chỉnh âm lượng (Loudness Normalization LUFS), lật gương nhẹ, chèn watermark thương hiệu Cos Dolove.
- [ ] **Phase 4: AI Content Generator**
  - Tích hợp Gemini API / OpenAI tự động sinh tiêu đề giật tít, caption hấp dẫn, hashtag thịnh hành và bình luận ghim.
- [ ] **Phase 5: Scheduling & Multi-Platform Publishing**
  - Lập lịch tự động và xuất bản video lên Facebook Reels thông qua Meta Graph API.
- [ ] **Phase 6: Analytics & Monitoring**
  - Thu thập số liệu lượt xem, tương tác, cảnh báo lỗi và nhật ký xuất bản.

---

## 📄 Bản Quyền (License)

Dự án được phân phối dưới giấy phép **[MIT License](LICENSE)**. Xem chi tiết tại file `LICENSE`.

Copyright (c) 2026 **Tunaanhgamedev**.
