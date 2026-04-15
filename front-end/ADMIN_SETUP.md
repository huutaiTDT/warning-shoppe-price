# Admin Panel Setup Guide

## Features

✅ **React Query for Data Management**
- Automatic caching and stale time management
- Query invalidation on mutations
- Loading and error states
- Background refetching

✅ **Ant Design UI Library**
- Professional dark-themed components
- Tables, modals, forms, buttons
- Consistent styling throughout
- Dark theme with emerald accents

✅ **Admin Features**
- View and manage Shops
- View and manage Products
- Real-time data from backend API
- Search and filter functionality
- CRUD operations (Create, Read, Update, Delete)
- Export/Import buttons (ready to implement)
- Sort and advanced filtering UI

## Installation

### 1. Install Dependencies

```bash
cd front-end
npm install
```

This will install:
- `react-router-dom` - Routing
- `@tanstack/react-query` - Data fetching and caching
- `antd` - UI component library
- `axios` - HTTP client

### 2. Backend Requirements

Make sure your backend is running on `http://localhost:3001` with these APIs:

```
GET  /api/shops              - List shops
POST /api/shops              - Create shop
PUT  /api/shops/:id          - Update shop
DELETE /api/shops/:id        - Delete shop

GET  /api/products           - List products
POST /api/products           - Create product
DELETE /api/products/:id     - Delete product
```

### 3. Run the Development Server

```bash
npm run dev
```

The admin panel will be available at: `http://localhost:5173/admin`

## Architecture

### Components Used

**AdminPage.jsx**
- Main admin interface component
- Layout with sidebar and content area
- Uses React Query for data fetching
- Ant Design components for UI

### API Integration

```javascript
// Using React Query
const { data, isLoading, isFetching } = useQuery({
  queryKey: ['shops'],
  queryFn: () => fetchShops(),
})

// Mutations with auto-invalidation
const deleteShopMutation = useMutation({
  mutationFn: deleteShop,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['shops'] })
    message.success('Deleted!')
  },
})
```

### Styling

- **Dark theme** with `#0f172a` background
- **Emerald accents** (`#10b981`) for primary actions
- **Slate colors** for text and borders
- **Tailwind-compatible** Ant Design configuration

## Features Implementation

### Current Features
- ✅ View shops and products in table format
- ✅ Search/filter functionality
- ✅ Delete operations
- ✅ Edit modal (ready for implementation)
- ✅ Copy to clipboard
- ✅ Real-time data fetching with React Query

### Ready to Implement
- 🔲 Export to Excel/CSV
- 🔲 Import from Excel/CSV
- 🔲 Advance filter/sort UI
- 🔲 Batch operations
- 🔲 Real-time updates (socket.io)

## Configuration

### Backend URL

Change the API base URL in `src/pages/AdminPage.jsx`:

```javascript
const API_BASE_URL = 'http://localhost:3001/api'
```

### React Query Settings

Adjust cache times in `src/App.jsx`:

```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
    },
  },
})
```

## Next Steps

1. **Add more tables** - Update TABLES array and add corresponding API calls
2. **Implement Edit functionality** - Add UPDATE API calls in modal
3. **Add Form validation** - Use Ant Design Form validation
4. **Implement batch operations** - Add multi-select for bulk delete
5. **Add real-time updates** - Connect to WebSocket for live data
6. **Customize theme** - Modify Ant Design theme tokens

## Troubleshooting

### "Cannot find module '@tanstack/react-query'"
```bash
npm install @tanstack/react-query
```

### Backend connection error
- Ensure backend is running on `http://localhost:3001`
- Check browser console for CORS errors
- Add CORS headers to backend if needed

### Dark theme not applying
- Clear browser cache
- Restart dev server: `npm run dev`
- Check that `src/index.css` is properly imported
