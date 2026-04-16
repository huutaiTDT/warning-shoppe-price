# Backend Routes Documentation

## ✅ Completed Routes

### Authentication (`/api/auth`)
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Shops (`/api/shops`)
- `GET /shops` - List all shops with pagination
- `POST /shops` - Create new shop
- `PUT /shops/:id` - Update shop
- `DELETE /shops/:id` - Delete shop
- `GET /shops/:id/products` - Get products for a shop
- `GET /shops/:id/products?count=true` - Get product count for a shop
- `POST /shops/:id/reset-product-status` - Reset product extraction status
- `POST /shops/:id/crawl` - Trigger shop crawl via external API

### Products (`/api/products`)
- `GET /products` - List products with filters
  - Query params: `page`, `search`, `minPrice`, `maxPrice`, `minRating`, `shop`, `overOriginal`
- `POST /products` - Create new product
  - Required: `name`, `priceMin`, `priceMax`, `shop_id`
  - Optional: `image`, `aff_link`, `original_price`, `rating`, `sold`, `description`, `external_id`
- `GET /products/export` - Export products to Excel
- `POST /products/import` - Import products from Excel

## 🔌 Route Endpoints Summary

```
Authentication
├── POST   /api/auth/login
└── POST   /api/auth/logout

Shops Management
├── GET    /api/shops
├── POST   /api/shops
├── PUT    /api/shops/:id
├── DELETE /api/shops/:id
├── GET    /api/shops/:id/products
├── POST   /api/shops/:id/reset-product-status
└── POST   /api/shops/:id/crawl

Product Management
├── GET    /api/products
├── POST   /api/products
├── GET    /api/products/export
└── POST   /api/products/import
```

## 📝 Example Requests

### Create Product
```bash
curl -X POST http://localhost:3001/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Product Name",
    "priceMin": 100,
    "priceMax": 200,
    "shop_id": "uuid",
    "original_price": 250,
    "external_id": "shopee-123"
  }'
```

### List Products with Filters
```bash
curl "http://localhost:3001/api/products?page=1&shop=uuid&search=phone&minPrice=100&maxPrice=500"
```

### Trigger Shop Crawl
```bash
curl -X POST http://localhost:3001/api/shops/uuid/crawl
```

## 🔐 Security Notes

- Add authentication middleware for protected routes
- Validate all input parameters
- Use environment variables for sensitive data
- Implement rate limiting for API endpoints

## 🚀 Next Steps

1. Add authentication middleware
2. Create services layer for database queries
3. Add request validation (joi/zod)
4. Add error logging
5. Create frontend API client functions
