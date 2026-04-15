# 🎉 React + Vite + Ant Design Migration Complete

## 📊 Thay đổi chính

### ❌ Xoá bỏ
- **Next.js** (app/, middleware.ts, next.config.mjs)
- **shadcn/ui** (components/ui/) → thay bằng **Ant Design**
- **Supabase** auth (lib/auth.ts)
- API routes (app/api/) → gọi backend tại localhost:3001
- Thêm 120+ shadcn component files
- Old build config (Next.js specific files)

### ✅ Thêm mới
- **Vite** build tool (5x nhanh hơn Next.js)
- **React Router** v6 cho routing
- **Ant Design** v5 cho UI components
- **Axios** client cho API calls
- Minimal dark mode theme
- Tailwind CSS v4 cho utility styling

## 📁 Cấu trúc mới (Lightweight)

```
project/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx              # Router config
│   ├── index.css            # Dark mode theme
│   ├── pages/               # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Shops.tsx
│   │   ├── Products.tsx
│   │   ├── CrawlHistory.tsx
│   │   └── Layout.tsx       # Sidebar + Header
│   ├── services/
│   │   └── api.ts           # Axios client → localhost:3001
│   └── lib/
│       └── utils.ts         # Helpers
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 🚀 Chạy

### Development
```bash
npm install
npm run dev
# http://localhost:5173
```

### Build Production
```bash
npm run build      # Build to dist/
npm run preview    # Preview build
```

## 🎨 UI Component Mapping

| Old (shadcn) | New (Ant Design) |
|--------------|-----------------|
| Custom Button | `<Button type="primary">` |
| Input | `<Input />` |
| Form | `<Form />` |
| Table | `<Table />` |
| Dialog | `<Modal />` |
| Select | `<Select />` |
| Card | `<Card />` |
| Dropdown | `<Dropdown />` |
| Layout | `<Layout />` |

## 🔧 API Configuration

Tất cả API calls router tới **`http://localhost:3001`**

```typescript
// src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**Thay đổi URL**: Edit file `.env`
```bash
VITE_API_URL=http://your-api-url:3001
```

## 🎯 Features

✅ Dashboard với thống kê  
✅ Quản lý cửa hàng (CRUD)  
✅ Quản lý sản phẩm (CRUD + Import/Export)  
✅ Quét dữ liệu từ cửa hàng  
✅ Lịch sử quét  
✅ Dark mode (Ant Design theme)  
✅ Vietnamese localization (vi_VN)  
✅ Auth with localStorage token  
✅ Responsive design  

## 📦 Bundle Size

**Vite + Ant Design** = lightweight production build
- CSS: 3.54 kB (gzipped)
- JS: 378.96 kB (gzipped) - includes Ant Design library

## 🔐 Authentication

- Token lưu ở `localStorage` với key `auth_token`
- Axios interceptor tự động:
  - Thêm token vào request headers
  - Redirect về login nếu 401 (unauthorized)

## ⚡ Performance

- **Fast cold start**: Vite chỉ serve files cần thiết
- **Fast refresh (HMR)**: <100ms khi edit code
- **Optimized build**: Tree-shaking, code splitting
- **Modern bundling**: ES modules

## 🧹 Cleanup

- ✂️ Xoá hết code Next.js
- ✂️ Xoá 120+ shadcn component files
- ✂️ Xoá API routes (moved to backend)
- ✂️ Simplified styling (dark mode only)
- ✂️ Removed borders/unnecessary CSS classes

## 📝 Demo Account

**Username:** admin  
**Password:** 123123

---

**Migration Date:** Apr 15, 2026  
**Branch:** front-end
