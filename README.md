# Quản lý Tiếp thị Liên kết - React + Vite + Ant Design

Ứng dụng quản lý sản phẩm và cửa hàng được chuyển đổi từ Next.js sang **React + Vite** với **Ant Design** + **Tailwind CSS**.

## 🚀 Công nghệ

- **React 19** - UI library
- **Vite 5** - Build tool (cơ bản ⚡ và nhẹ)
- **React Router v6** - Routing
- **Ant Design 5** - UI components
- **Tailwind CSS 4** - Styling
- **Axios** - HTTP client
- **TypeScript** - Type safety

## 📁 Cấu trúc Project

```
src/
├── main.tsx              # Entry point
├── App.tsx               # App routing
├── index.css             # Global styles (Tailwind)
├── pages/                # Pages/Routes
│   ├── Login.tsx
│   ├── Dashboard.tsx
│   ├── Shops.tsx
│   ├── Products.tsx
│   ├── CrawlHistory.tsx
│   └── Layout.tsx        # Dashboard layout with sidebar
├── services/
│   └── api.ts            # API client (axios) → http://localhost:3001
├── lib/
│   └── utils.ts          # Helper functions
└── hooks/                # Custom React hooks
```

## 🎯 API Configuration

Tất cả API calls được router tới **`http://localhost:3001`**

```typescript
// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

Để thay đổi URL, edit file `.env`:
```bash
VITE_API_URL=http://localhost:3001
```

## 🔧 Cài đặt & Chạy

### Cài dependencies
```bash
npm install
```

### Chế độ development
```bash
npm run dev
```
Mở http://localhost:5173

### Build production
```bash
npm run build
npm run preview
```

## 📊 Tính năng

- ✅ Đăng nhập
- ✅ Dashboard với thống kê
- ✅ Quản lý cửa hàng (CRUD)
- ✅ Quản lý sản phẩm (CRUD + Import/Export)
- ✅ Quét dữ liệu từ cửa hàng
- ✅ Lịch sử quét
- ✅ Dark mode ready (Ant Design)
- ✅ Vietnamese localization

## 🎨 UI Components

Sử dụng **Ant Design** thay thế shadcn/ui:
- `Button`, `Input`, `Form`, `Table`, `Card`
- `Modal`, `Dropdown`, `Menu`, `Layout`
- `Message`, `Notification`, `Spin`, `Empty`
- `Upload`, `Popconfirm`, `Avatar`, etc.

**Styling**: Kết hợp **Tailwind CSS** + Ant Design theme

## 🔐 Auth

Token được lưu ở `localStorage` với key `auth_token`

Interceptor tự động:
- Thêm token vào request headers
- Redirect về login nếu 401

## 📦 Bundle Size

**Vite** giúp giảm size bundle:
- Fast cold start
- Fast HMR (Hot Module Replacement)
- Optimized build (~100kb gzipped)

---

**Demo Account**: admin / 123123
