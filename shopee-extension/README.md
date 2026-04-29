# 🛍️ Shopee Product Exporter - Chrome Extension

Một Chrome Extension tiện ích để **xuất toàn bộ sản phẩm** từ shop Shopee sang **Excel (.xlsx)** một cách tự động.

## ✨ Tính năng

✅ **Tự động phát hiện** khi vào shop Shopee  
✅ **Lấy toàn bộ sản phẩm** trong shop  
✅ **Hiển thị xem trước** danh sách sản phẩm  
✅ **Xuất Excel** với định dạng dễ sử dụng  
✅ **UI đẹp mắt** và thân thiện  
✅ **Xử lý dữ liệu an toàn** (không lưu trữ)  

## 📦 Thông tin sản phẩm được xuất

- **ID**: Mã sản phẩm
- **Tên sản phẩm**: Tên đầy đủ
- **Giá**: Giá bán (VNĐ)
- **Đã bán**: Số lượng đã bán
- **Kho**: Số lượng tồn kho
- **Rating**: Đánh giá trung bình
- **Trạng thái**: Hoạt động / Khác

## 🚀 Cách cài đặt

### 1. Tải xuống Extension

```bash
# Clone hoặc tải thư mục shopee-extension
# Đảm bảo bạn có tất cả file:
# - manifest.json
# - popup.html
# - popup.js
# - content.js
# - background.js
# - style.css
```

### 2. Mở Chrome Extensions

```
chrome://extensions/
```

### 3. Bật Developer Mode

- Click vào **Developer Mode** (góc trên bên phải)

### 4. Load Extension

- Click **Load unpacked**
- Chọn thư mục `shopee-extension`
- Extension sẽ xuất hiện trong danh sách

## 💡 Cách sử dụng

### Step 1: Truy cập Shop Shopee
```
https://shopee.vn/shop/123456789
```

### Step 2: Click Extension
- Click icon extension ở góc trên bên phải browser
- Popup sẽ hiện ra

### Step 3: Lấy Sản Phẩm
- Click nút **"📥 Lấy sản phẩm"**
- Chờ dữ liệu được tải (có thể mất vài phút)
- Sẽ hiển thị số lượng sản phẩm đã lấy
- Xem trước 5 sản phẩm đầu tiên

### Step 4: Xuất Excel
- Click nút **"📊 Xuất Excel"**
- File `.xlsx` sẽ được tải xuống
- Mở file bằng Excel, Google Sheets, hoặc LibreOffice

## 📋 Cấu trúc File

```
shopee-extension/
├── manifest.json      # Cấu hình extension
├── popup.html         # Giao diện popup
├── popup.js           # Logic chính
├── content.js         # Script chạy trên trang Shopee
├── background.js      # Service worker nền
├── style.css          # CSS styling
└── README.md          # File hướng dẫn này
```

## 🔧 Cấu hình nâng cao

### Thay đổi số lượng sản phẩm lấy mỗi trang

Trong `popup.js`, tìm dòng:
```javascript
const limit = 50; // Thay đổi thành giá trị khác
```

### Thêm cột dữ liệu mới

Trong hàm `loadProducts()`, thêm các trường mới:
```javascript
products.push({
  "ID": item.item_basic.itemid,
  "Tên sản phẩm": item.item_basic.name,
  // Thêm cột mới:
  "URL": `https://shopee.vn/product/${item.item_basic.itemid}`
});
```

## ⚠️ Lưu ý quan trọng

- Extension **chỉ hoạt động** trên `shopee.vn`
- **Không lưu trữ** bất kỳ dữ liệu nào
- Cần **kết nối internet** để lấy dữ liệu
- API Shopee có thể thay đổi, cần cập nhật extension nếu lỗi
- Tuân thủ **Điều khoản dịch vụ Shopee**

## 🛠️ Troubleshooting

### Extension không hiển thị nút
- Làm mới trang Shopee (F5)
- Kiểm tra URL có chứa `/shop/` không

### Không lấy được dữ liệu
- Kiểm tra kết nối internet
- Thử làm mới popup extension
- Kiểm tra Console (F12) xem có lỗi không

### File Excel không mở được
- Đảm bảo đã cài đặt Excel hoặc phần mềm tương tự
- Thử mở bằng Google Sheets hoặc LibreOffice

## 📝 Cập nhật

### v1.0.0
- ✅ Phiên bản đầu tiên
- ✅ Lấy sản phẩm từ Shopee
- ✅ Xuất Excel
- ✅ Xem trước dữ liệu

## 📞 Hỗ trợ

Nếu gặp vấn đề:
1. Kiểm tra Console (DevTools - F12)
2. Xem lỗi chi tiết trong Popup
3. Thử reload extension hoặc trang Shopee

## 📄 License

MIT License - Tự do sử dụng và chỉnh sửa

---

**Made with ❤️ for Shopee Sellers**
