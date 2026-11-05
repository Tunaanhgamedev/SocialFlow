<div align="center">

# ⚡ SocialFlow – Multi-Platform Social Media Automation Manager

**Hệ thống tự động hóa toàn diện quy trình tiếp nhận, kiểm duyệt bản quyền, chuẩn hóa video 9:16 và xuất bản Reels đa nền tảng**

[![License: MIT](https://img.shields.io/badge/License-MIT-14b8a6.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-22c55e.svg?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3b82f6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18+-06b6d4.svg?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19+-6366f1.svg?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4+-38bdf8.svg?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-6.0+-007808.svg?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![Architecture](https://img.shields.io/badge/Architecture-Monorepo%20(pnpm)-f97316.svg?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

[Tính Năng Chính](#-tính-năng-cốt-lõi) •
[Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống) •
[Chiến Lược Lưu Trữ](#-chiến-lược-lưu-trữ-local-trước--cloud-sau) •
[Khởi Chạy 1-Click](#-hướng-dẫn-khởi-chạy-1-click-windows) •
[Cài Đặt Lập Trình Viên](#-hướng-dẫn-cài-đặt-cho-lập-trình-viên) •
[API Reference](#-danh-mục-api-endpoints) •
[Lộ Trình](#-lộ-trình-phát-triển-roadmap)

</div>

---

## 📖 Giới Thiệu Tổng Quan

**SocialFlow** là nền tảng quản trị và tự động hóa chuỗi cung ứng nội dung video ngắn (Shorts / Reels / TikTok) được xây dựng dành riêng cho các nhà sáng tạo nội dung, media studio và đội ngũ reup chuyên nghiệp.

Thay vì phải tốn hàng giờ mỗi ngày để tải video thủ công, chỉnh sửa kích thước, viết lại caption và canh giờ đăng bài, SocialFlow tự động hóa toàn bộ quy trình:

```
[ Nguồn Video (Douyin / Folder / Upload) ]
                   │
                   ▼
[ 1. Ingestion Engine & Chống Trùng Lặp (SHA-256) ]
                   │
                   ▼
[ 2. Storage Provider ("Local Trước – Cloud Sau") ]
                   │
                   ▼
[ 3. Bộ Lọc Bản Quyền & Giấy Phép (Digital Rights Management) ]
                   │
                   ▼
[ 4. Chuẩn Hóa FFmpeg 9:16 & Metadata Extraction ]
                   │
                   ▼
[ 5. AI Content Generator (Tiêu đề, Caption, Hashtag, Bình luận ghim) ]
                   │
                   ▼
[ 6. Hàng Đợi Điều Phối & Lập Lịch Xuất Bản (BullMQ / Cron) ]
                   │
                   ▼
[ Xuất Bản Tự Động: Facebook Reels / TikTok / YouTube Shorts ]
```

> [!IMPORTANT]
> **Cam kết Bản Quyền & Tính Toàn Vẹn:** SocialFlow tích hợp cổng kiểm duyệt quyền sở hữu trí tuệ (**Rights Management Gatekeeper**). Hệ thống kiên quyết ngăn chặn các video chưa được cấp phép hoặc không có sự đồng thuận từ chủ sở hữu trước khi đưa vào lịch đăng.

---

## 🌟 Tính Năng Cốt Lõi

### 1. 🎛️ Khởi Chạy Siêu Tốc 1-Click Trên Windows
* **Dành cho người dùng cuối:** Không cần mở cửa sổ dòng lệnh, không cần nhớ cú pháp code. Nhấp đúp vào **`CHAY_SOCIALFLOW.bat`** hoặc **`START.bat`**.
* **Tự động hóa hoàn toàn:**
  * Tự kiểm tra môi trường Node.js và pnpm.
  * Tự động quét và giải phóng các port đang bị xung đột (`3000` & `5173`).
  * Tự kiểm tra và bật dịch vụ PostgreSQL.
  * Tự biên dịch các thư viện nội bộ (`@socialflow/shared`, `@socialflow/database`) và đồng bộ Prisma Client.
  * Khởi chạy song song Backend API & Frontend Dashboard.
  * **Tự động mở trình duyệt web** đến `http://localhost:5173` sau 4 giây.
* **Shortcut Desktop:** Tiện ích `Tao_Shortcut_Desktop.bat` tạo ngay lối tắt SocialFlow ngoài màn hình máy tính chỉ với 1 cú nhấp.
* **Dừng khẩn cấp:** Tiện ích `DUNG_SOCIALFLOW.bat` tắt sạch mọi tiến trình chạy ngầm và giải phóng tài nguyên ngay lập tức.

### 2. 📥 Tiếp Nhận Đa Kênh & Quản Lý Nguồn Video
* **Import qua URL Douyin / Web Link:**
  * Bóc tách thông tin tác giả, tiêu đề gốc và link stream video.
  * Cơ chế xử lý trung thực: Khi link Douyin bị bảo vệ bởi mã chống crawl (Captcha/Cookie), hệ thống gắn cờ `FAILED` kèm thông báo hướng dẫn, **tuyệt đối không giả lập thành công khi chưa có tệp tin thực tế**.
* **Upload Kéo Thả Đa File (Multi-File Drag & Drop):**
  * Hỗ trợ tải cùng lúc nhiều video định dạng `.mp4`, `.mov`, `.webm`, `.mkv` (dung lượng tối đa 500MB/file).
  * Thanh tiến trình thời gian thực, gắn nhãn bản quyền ngay khi tải lên.
* **Giám Sát Thư Mục Tự Động (Real-time Folder Watcher):**
  * Tích hợp `Chokidar` liên tục theo dõi thư mục máy tính cục bộ.
  * Hỗ trợ chế độ chống đọc file dở dang (`awaitWriteFinish`), quét tức thì (`scan`) và loại trừ file trùng lặp.
  * **Bảo mật Path Traversal:** Ngăn chặn triệt để hành vi theo dõi các thư mục gốc ổ đĩa (`C:\`, `D:\`, `/`) và thư mục hệ điều hành nhạy cảm (`C:\Windows`, `Program Files`,...).
* **Xác Thực Video Đa Lớp (Multi-Layer Verification):**
  * Kiểm tra **Magic Bytes** ở cấp độ nhị phân (chữ ký `ftyp`/`moov` của MP4/MOV, EBML `0x1A45DFA3` của WebM/MKV).
  * Chạy `ffprobe` xác thực luồng video thực tế có thể giải mã được, chặn đứng các tệp tin giả mạo phần mở rộng.
  * Băm mã **SHA-256** tự động loại bỏ 100% video trùng lặp nội dung.

### 3. 🛡️ Quản Lý Quyền Sở Hữu (Digital Rights Management)
* Hệ thống phân loại 6 trạng thái quyền minh bạch:
  * `AUTHORIZED`: Đã có văn bản / tin nhắn chấp thuận của tác giả.
  * `LICENSED`: Đã mua giấy phép bản quyền thương mại.
  * `PENDING_REVIEW`: Đang chờ kiểm duyệt (mặc định cho video mới nạp).
  * `PROHIBITED`: Bị cấm sử dụng, vi phạm bản quyền.
  * `REVOKED`: Giấy phép đã hết hạn hoặc bị chủ sở hữu thu hồi.
  * `PUBLIC_DOMAIN`: Video thuộc phạm vi công cộng.
* **Cơ chế khóa an toàn:** Hệ thống tự động khóa tính năng lập lịch và xuất bản đối với các video ở trạng thái `PENDING_REVIEW` hoặc `PROHIBITED`.
* Giao diện modal cập nhật chứng từ, link thỏa thuận và ghi chú tác quyền trực quan.

### 4. 🎬 Trình Phát Video & Trích Xuất Metadata Tự Động
* **Trích xuất thông số kỹ thuật chuyên sâu:** Sử dụng `ffprobe` đọc độ phân giải, thời lượng, bitrate, codec âm thanh/hình ảnh, tốc độ khung hình (fps) và kiểm tra chuẩn tỷ lệ khung hình 9:16 (1080x1920).
* **Tự động chụp ảnh bìa (Thumbnail Extraction):** Sử dụng `ffmpeg` chụp frame sắc nét tại giây thứ 1 của video, lưu trữ và đồng bộ vào thư viện.
* **HTTP 206 Partial Content Streaming:**
  * Hỗ trợ đầy đủ chuẩn HTTP Range (`bytes=0-1024`, open-ended `bytes=1000-`, suffix range `bytes=-500`).
  * Trả về mã chuẩn `416 Range Not Satisfiable` khi yêu cầu vượt quá dung lượng tệp.
  * Cho phép người dùng tua nhanh, phát mượt mà trực tiếp trên giao diện trình duyệt không cần chờ tải toàn bộ file.

---

## 🏗️ Kiến Trúc Hệ Thống

Dự án được cấu trúc theo mô hình **Monorepo** chuẩn mực với `pnpm workspaces`, phân tách rõ ràng trách nhiệm giữa các tầng:

```
SocialFlow/
├── apps/
│   ├── web/                    # [Frontend] React 18 + TypeScript + Vite + Tailwind CSS
│   │   ├── src/
│   │   │   ├── features/       # Feature modules: video-upload, rights-management
│   │   │   ├── pages/          # Dashboard, VideosPage, SourcesPage, AccountsPage,...
│   │   │   ├── components/     # Layout, UI components dùng chung
│   │   │   └── services/       # Typed API Client giao tiếp Backend
│   │   └── vite.config.ts      # Proxy reverse /api sang backend port 3000
│   │
│   ├── api/                    # [Backend REST API] Node.js + Express + TypeScript
│   │   ├── src/
│   │   │   ├── modules/        # Domain modules: videos, sources, rights, folders, accounts,...
│   │   │   ├── services/       # Storage providers, metadata, video validator, queue
│   │   │   ├── middlewares/    # Request logger, Error handler, CORS validator
│   │   │   └── routes/         # API router v1
│   │   └── tsconfig.json
│   │
│   └── worker/                 # [Background Processing] BullMQ Workers
│       └── src/
│           └── processors/     # Download, FFmpeg 9:16, AI Generator, Publisher
│
├── packages/
│   ├── database/               # [Database Core] PostgreSQL + Prisma ORM v6
│   │   ├── prisma/
│   │   │   └── schema.prisma   # Schema 7 nhóm thực thể quản trị
│   │   └── src/index.ts        # Typed Prisma Client export
│   │
│   └── shared/                 # [Common Contracts] DTOs, Enums, Zod Schemas
│       └── src/
│           ├── enums/          # VideoStatus, RightsStatus, StorageProviderType,...
│           ├── types/          # VideoDto, StorageUploadResult, StorageStreamResult,...
│           └── validators/     # Zod runtime validation schemas
│
├── storage/                    # [Phân Vùng Lưu Trữ File]
│   ├── originals/              # Video gốc sau khi nạp / tải về
│   ├── processed/              # Video chuẩn hóa 9:16 (sau xử lý FFmpeg)
│   ├── thumbnails/             # Ảnh bìa (Poster / Thumbnail)
│   └── temp/                   # File tạm trong quá trình tải & biên tập
│
├── scripts/                    # Shell scripts & PowerShell helpers
├── CHAY_SOCIALFLOW.bat         # Trình khởi chạy 1-Click chính thức
├── START.bat                   # Alias khởi chạy nhanh
├── Tao_Shortcut_Desktop.bat    # Tiện ích ghim icon ra màn hình Desktop
├── DUNG_SOCIALFLOW.bat         # Tiện ích dọn dẹp port & dừng server
├── docker-compose.yml          # Container PostgreSQL 16 & Redis 7
└── pnpm-workspace.yaml         # Định nghĩa cấu trúc Monorepo
```

### Sơ Đồ Luồng Hoạt Động (Data Flow)

```mermaid
flowchart LR
    subgraph INGESTION ["📥 Nguồn Tiếp Nhận"]
        A1["URL Douyin"]
        A2["Upload Thủ Công"]
        A3["Folder Watcher"]
    end

    subgraph VALIDATION ["🛡️ Kiểm Định & Lưu Trữ"]
        B1["Magic Bytes & FFprobe Check"]
        B2["SHA-256 Deduplication"]
        B3["Storage Provider Engine"]
    end

    subgraph DATABASE ["🗄️ PostgreSQL + Prisma"]
        C1[("Videos (storageKey, fileHash)")]
        C2[("Video Assets (ORIGINAL / THUMBNAIL)")]
        C3[("Digital Rights (Bản quyền)")]
    end

    subgraph CORE_SERVICES ["⚙️ Bộ Xử Lý Nền"]
        D1["Metadata Service (ffprobe)"]
        D2["Thumbnail Generator (ffmpeg)"]
        D3["Streaming Engine (HTTP 206)"]
    end

    subgraph UI ["💻 React Web Dashboard"]
        E1["Video Library (Grid / List)"]
        E2["HTML5 Stream Player"]
        E3["Quản Lý Quyền & Lập Lịch"]
    end

    INGESTION --> B1
    B1 --> B2
    B2 --> B3
    B3 --> C1 & C2
    C1 --> C3
    B3 --> D1 & D2
    D1 & D2 --> C1 & C2
    C1 & C2 --> D3
    D3 --> E2
    C1 & C3 --> E1 & E3
```

---

## 💾 Chiến Lược Lưu Trữ: "Local Trước – Cloud Sau"

SocialFlow thiết kế kiến trúc lưu trữ theo mô hình **Storage Provider Pattern**, phân tách rạch ròi giữa tầng logic nghiệp vụ (`VideoService`) và hạ tầng lưu trữ vật lý.

```mermaid
flowchart TD
    SVC["Video Service / Ingestion Worker"] --> |"Gọi IStorageProvider API<br/>upload(), delete(), getStream(), getUrl()"| FACTORY["StorageFactory"]
    FACTORY --> |"STORAGE_PROVIDER=LOCAL (Mặc định)"| LOCAL["LocalStorageProvider<br/>(Lưu ổ cứng máy tính)"]
    FACTORY -.-> |"STORAGE_PROVIDER=S3 / R2 (Tương lai)"| CLOUD["CloudStorageProvider<br/>(AWS S3 / Cloudflare R2 / Supabase)"]

    LOCAL --> DIR1["storage/originals/"]
    LOCAL --> DIR2["storage/processed/"]
    LOCAL --> DIR3["storage/thumbnails/"]
    LOCAL --> DIR4["storage/temp/"]

    CLOUD -.-> BUCKET[("Cloud Storage Bucket<br/>(S3, R2, MinIO, Supabase)")]
```

### 3 Nguyên Tắc Cốt Lõi:

1. **Giai đoạn Hiện Tại (Local Storage):**
   * Lưu trữ phân tầng trực tiếp trên ổ đĩa máy tính: `storage/originals/`, `storage/processed/`, `storage/thumbnails/`, `storage/temp/`.
   * **Chi phí lưu trữ = $0**, tốc độ đọc ghi tối đa trên ổ SSD cục bộ.
2. **Giai đoạn Mở Rộng (Cloud Storage):**
   * Đã tích hợp sẵn SDK `@aws-sdk/client-s3` và `@aws-sdk/s3-request-presigner`.
   * Khi muốn chuyển lên Cloud (Amazon S3, Cloudflare R2, MinIO, Supabase), bạn **chỉ cần thay đổi biến môi trường** trong file `.env`:
     ```env
     STORAGE_PROVIDER=R2
     STORAGE_BUCKET=socialflow-videos
     STORAGE_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
     STORAGE_ACCESS_KEY=...
     STORAGE_SECRET_KEY=...
     ```
   * **Không cần sửa bất kỳ một dòng code nghiệp vụ nào** trong hệ thống.
3. **Quy Tắc Định Danh Bất Biến (Relative Keys):**
   * Cơ sở dữ liệu PostgreSQL **chỉ lưu `storageProvider` và `storageKey` tương đối** (ví dụ: `originals/1730000000_cosplay.mp4`, `thumbnails/thumb_123.jpg`).
   * **Tuyệt đối không lưu đường dẫn ổ đĩa tuyệt đối** (như `E:\Auto Reup...`). Nhờ vậy, việc sao lưu, di chuyển dự án hay đồng bộ dữ liệu lên mây diễn ra mượt mà và an toàn 100%.

---

## ⚡ Hướng Dẫn Khởi Chạy 1-Click (Windows)

> Đây là cách nhanh nhất và tiện lợi nhất để sử dụng SocialFlow hàng ngày.

```
[ Bước 1: Tạo Icon Desktop ] ────► Chạy 'Tao_Shortcut_Desktop.bat' (Chỉ cần làm 1 lần)
                                              │
                                              ▼
[ Bước 2: Bật Ứng Dụng ]     ────► Nhấp đúp vào icon 'SocialFlow' ngoài Desktop (hoặc 'CHAY_SOCIALFLOW.bat')
                                              │
                                              ▼
[ Bước 3: Tự Động Vào Web ]  ────► Trình duyệt tự mở 'http://localhost:5173' để sử dụng ngay!
                                              │
                                              ▼
[ Bước 4: Tắt Ứng Dụng ]     ────► Đóng cửa sổ lệnh hoặc nhấp đúp vào 'DUNG_SOCIALFLOW.bat'
```

### Bảng Điều Khiển File Thực Thi:

| Tên File | Chức Năng | Chi Tiết Thực Hiện |
| :--- | :--- | :--- |
| **`CHAY_SOCIALFLOW.bat`**<br>*(hoặc **`START.bat`**)* | **Khởi động toàn bộ hệ thống** | Kiểm tra Node.js, dọn sạch port 3000 & 5173, bật PostgreSQL, đồng bộ Prisma, build gói nội bộ, chạy Backend + Frontend và tự động mở trình duyệt sau 4 giây. |
| **`Tao_Shortcut_Desktop.bat`** | **Tạo icon ngoài màn hình chính** | Tự động tạo một shortcut mang tên **SocialFlow** ra Desktop của bạn để tiện nhấp đúp mỗi ngày. |
| **`DUNG_SOCIALFLOW.bat`** | **Tắt sạch toàn bộ tiến trình** | Quét và tiêu diệt các tiến trình đang chiếm port 3000 (API) và 5173 (Web), đưa máy về trạng thái giải phóng tài nguyên. |

---

## 💻 Hướng Dẫn Cài Đặt Cho Lập Trình Viên

### 1. Yêu Cầu Môi Trường (Prerequisites)

* **Node.js**: Phiên bản `v20.0.0` trở lên ([Tải tại đây](https://nodejs.org/)).
* **pnpm**: Phiên bản `v9.0.0+` (Cài đặt: `npm install -g pnpm`).
* **FFmpeg & FFprobe**: Đã cài đặt và thêm vào biến môi trường `PATH` hệ thống ([Tải bản Windows Gyan.dev](https://www.gyan.dev/ffmpeg/builds/)).
* **PostgreSQL**: Phiên bản `15+` (Chạy local service hoặc qua Docker).
* **Redis**: Phiên bản `7+` (Tùy chọn, phục vụ hàng đợi tác vụ nền BullMQ).

### 2. Cài Đặt Mã Nguồn

```powershell
# Clone mã nguồn từ GitHub
git clone https://github.com/Tunaanhgamedev/SocialFlow.git
cd SocialFlow

# Cài đặt toàn bộ dependencies trong monorepo
pnpm install
```

### 3. Cấu Hình Biến Môi Trường (`.env`)

Sao chép tệp mẫu `.env.example` thành `.env` tại thư mục gốc:

```env
# Server Network
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:5173

# Database (PostgreSQL)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/socialflow?schema=public

# Redis & BullMQ
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Security & Tokens
JWT_SECRET=super-secret-jwt-key-replace-in-production-12345
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Storage Strategy (LOCAL | S3 | R2 | SUPABASE)
STORAGE_PROVIDER=LOCAL
STORAGE_LOCAL_ROOT=./storage

# AI Provider (mock | gemini | openai)
AI_ACTIVE_PROVIDER=mock
GEMINI_API_KEY=
OPENAI_API_KEY=

# Meta Graph API (Facebook Reels)
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/api/v1/accounts/connect/meta/callback
```

### 4. Đồng Bộ Cơ Sở Dữ Liệu

```powershell
# Sinh mã nguồn TypeScript cho Prisma Client
pnpm db:generate

# Đẩy cấu trúc schema lên database PostgreSQL
pnpm db:push

# (Tùy chọn) Mở giao diện Prisma Studio để quản lý dữ liệu trực quan
pnpm db:studio
```

### 5. Khởi Chạy Môi Trường Development

```powershell
# Chạy đồng thời cả Backend API và Frontend Dashboard (Tự động build shared & database trước)
pnpm dev
```

Hoặc chạy độc lập từng phân hệ trong các cửa sổ terminal riêng biệt:

```powershell
pnpm dev:api      # Khởi động Backend API tại http://localhost:3000
pnpm dev:web      # Khởi động Web Dashboard tại http://localhost:5173
pnpm dev:worker   # Khởi động BullMQ Worker xử lý tác vụ nền
```

### 6. Kiểm Thử & Biên Dịch (Build)

```powershell
# Kiểm tra TypeScript typecheck toàn bộ monorepo
pnpm typecheck

# Biên dịch hoàn chỉnh toàn bộ packages và applications
pnpm build
```

---

## 📡 Danh Mục API Endpoints

Tất cả các API nghiệp vụ đều có tiền tố `/api/v1` và hỗ trợ chuẩn JSON phản hồi nhất quán:

### Quản Lý Video (`/api/v1/videos`)
| Method | Endpoint | Mô Tả Nghiệp Vụ |
| :--- | :--- | :--- |
| `POST` | `/api/v1/videos/upload` | Upload một hoặc nhiều file video (Multipart form-data, kiểm tra magic bytes, chống trùng SHA-256, hỗ trợ rollback khi lỗi). |
| `GET` | `/api/v1/videos` | Lấy danh sách video (Hỗ trợ phân trang, tìm kiếm tiêu đề, lọc theo trạng thái, lọc theo quyền và sắp xếp đa chiều). |
| `GET` | `/api/v1/videos/:id` | Xem chi tiết metadata, thông số kỹ thuật (độ phân giải, fps, bitrate), tài sản assets và thông tin bản quyền của video. |
| `DELETE` | `/api/v1/videos/:id` | Xóa bản ghi video khỏi cơ sở dữ liệu và dọn dẹp sạch sẽ toàn bộ file gốc, thumbnail liên quan trên bộ nhớ lưu trữ. |
| `GET` | `/api/v1/videos/:id/stream` | Stream nội dung video phục vụ trình phát HTML5, hỗ trợ chuẩn **HTTP 206 Partial Content Range** và **HTTP 416**. |
| `GET` | `/api/v1/videos/:id/thumbnail` | Lấy file ảnh bìa (thumbnail) chất lượng cao trích xuất từ video. |
| `POST` | `/api/v1/videos/:id/approve` | Duyệt video đủ điều kiện đưa vào luồng xuất bản. |
| `POST` | `/api/v1/videos/:id/reject` | Từ chối video và ghi chú nguyên nhân không đạt yêu cầu. |

### Quản Lý Nguồn Video (`/api/v1/sources`)
| Method | Endpoint | Mô Tả Nghiệp Vụ |
| :--- | :--- | :--- |
| `POST` | `/api/v1/sources/douyin` | Tiếp nhận và nạp link chia sẻ video Douyin (tự động phân tích stream không watermark). |
| `POST` | `/api/v1/sources/import` | Tiếp nhận video từ đường dẫn URL ngoài hoặc video trực tiếp. |
| `GET` | `/api/v1/sources` | Danh sách các nguồn cung cấp video đang được quản lý trong hệ thống. |

### Quản Lý Bản Quyền (`/api/v1/rights`)
| Method | Endpoint | Mô Tả Nghiệp Vụ |
| :--- | :--- | :--- |
| `POST` | `/api/v1/rights/:videoId` | Cập nhật trạng thái quyền sở hữu (`AUTHORIZED`, `LICENSED`,...), bổ sung văn bản cam kết và chứng từ cấp quyền. |
| `GET` | `/api/v1/rights/:videoId` | Truy vấn thông tin và lịch sử xác minh bản quyền của video. |

### Giám Sát Thư Mục (`/api/v1/folders`)
| Method | Endpoint | Mô Tả Nghiệp Vụ |
| :--- | :--- | :--- |
| `POST` | `/api/v1/folders/watch` | Đăng ký theo dõi tự động một thư mục video trên máy (có cơ chế kiểm tra bảo mật thư mục). |
| `POST` | `/api/v1/folders/unwatch` | Hủy theo dõi thư mục. |
| `POST` | `/api/v1/folders/scan` | Kích hoạt quét tức thì và nạp tất cả các video mới tìm thấy trong thư mục. |
| `GET` | `/api/v1/folders/watchers` | Danh sách các thư mục đang được hệ thống giám sát thời gian thực. |

### Sức Khỏe Hệ Thống (`/api/v1/health`)
| Method | Endpoint | Mô Tả Nghiệp Vụ |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Kiểm tra tình trạng kết nối PostgreSQL, Redis Queue, Storage Provider và danh sách các AI Provider sẵn sàng. |

---

## 🗺️ Lộ Trình Phát Triển (Roadmap)

- [x] **Phase 1: Architecture & Foundation (Nền Tảng & Khung Kiến Trúc)**
  - Thiết lập Monorepo pnpm workspaces, TypeScript strict mode, Tailwind CSS v3, Prisma schema 7 nhóm thực thể, Docker compose (Postgres + Redis).
- [x] **Phase 2: Source & Video Management (Quản Lý Nguồn & Video)**
  - Xây dựng Video Library UI (chế độ Grid/List, tìm kiếm, lọc, sắp xếp).
  - Upload kéo thả nhiều file với xác thực Magic Bytes và cơ chế Rollback Transaction.
  - Tích hợp Chokidar Folder Watcher với cơ chế bảo mật chống Path Traversal.
  - Trích xuất Metadata với `ffprobe` và Thumbnail tự động với `ffmpeg`.
  - Bộ phát video HTML5 streaming chuẩn HTTP 206 Partial Content Range.
  - Cổng kiểm soát bản quyền nghiêm ngặt (Digital Rights Management).
  - Triển khai kiến trúc **Storage Provider Pattern ("Local trước – Cloud sau")** sẵn sàng cho S3/R2.
  - Bộ công cụ 1-Click launcher trên Windows (`CHAY_SOCIALFLOW.bat`, `START.bat`, `Tao_Shortcut_Desktop.bat`, `DUNG_SOCIALFLOW.bat`).
- [ ] **Phase 3: Video Processing Engine (Xử Lý Video với FFmpeg - Tiếp Theo)**
  - Tự động chuẩn hóa tỷ lệ khung hình 9:16 (1080x1920) bằng padding mờ (blurred background) hoặc crop thông minh.
  - Cắt gọt đầu/đuôi (trim), điều chỉnh tốc độ, lật gương nhẹ để tối ưu thuật toán đề xuất của nền tảng.
  - Chuẩn hóa âm lượng chuẩn phát thanh quốc tế (Loudness Normalization LUFS).
  - Đóng dấu watermark nhận diện thương hiệu kênh Cos Dolove.
  - Hàng đợi tác vụ biên dịch nặng thông qua BullMQ Worker.
- [ ] **Phase 4: AI Content Generator (Trí Tuệ Nhân Tạo Tạo Nội Dung)**
  - Tích hợp Gemini API / OpenAI tự động nhận diện nội dung video.
  - Sinh tiêu đề giật tít, caption thu hút, bộ hashtag thịnh hành và bình luận ghim tương tác.
- [ ] **Phase 5: Scheduling & Multi-Platform Publishing (Lập Lịch & Xuất Bản Tự Động)**
  - Lập lịch phát hành thông minh theo khung giờ vàng tương tác.
  - Tự động đăng tải trực tiếp lên Facebook Reels thông qua Meta Graph API.
  - Mở rộng hỗ trợ TikTok Content Posting API và YouTube Shorts.
- [ ] **Phase 6: Analytics & Monitoring (Giám Sát & Báo Cáo Hiệu Quả)**
  - Thống kê lượt xem, lượt thích, chia sẻ và tăng trưởng người theo dõi.
  - Cảnh báo lỗi đăng bài tức thời và nhật ký kiểm toán hệ thống.

---

## 🤝 Đóng Góp & Phát Triển (Contributing)

Mọi đóng góp nhằm hoàn thiện mã nguồn và tối ưu hóa hệ thống đều được hoan nghênh:

1. Fork dự án trên GitHub: [Tunaanhgamedev/SocialFlow](https://github.com/Tunaanhgamedev/SocialFlow)
2. Tạo nhánh tính năng mới: `git checkout -b feature/AmazingFeature`
3. Commit các thay đổi: `git commit -m "feat: add some amazing feature"`
4. Đẩy lên nhánh của bạn: `git push origin feature/AmazingFeature`
5. Mở một **Pull Request** trên GitHub.

---

## 📄 Bản Quyền & Giấy Phép (License)

Dự án được phân phối chính thức dưới giấy phép **[MIT License](LICENSE)**. Bạn được toàn quyền sử dụng, sửa đổi, phân phối và tích hợp vào các dự án thương mại hoặc cá nhân.

Copyright (c) 2026 **Tunaanhgamedev**.
