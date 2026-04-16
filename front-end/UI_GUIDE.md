# 🎨 UI Style Guide - Admin Dashboard

## Design Philosophy

**Clean • Minimal • Dark Mode • No Borders**

Thiết kế UI theo phong cách **modern database admin** (giống Supabase, Firebase Console).

---

## 🎯 Color Palette

| Color | Usage | Value |
|-------|-------|-------|
| **Dark BG** | Main background | `#111827` (gray-900) |
| **Card BG** | Cards & panels | `#1f2937` (gray-900) |
| **Input BG** | Inputs, selects | `#1f2937` (gray-800) |
| **Border** | Subtle dividers | `#374151` (gray-700) |
| **Primary** | Buttons, accents | `#10b981` (emerald-600) |
| **Alert** | Warnings, errors | `#ef4444` (red-500) |
| **Success** | Status badges | `#10b981` (emerald-500) |
| **Text** | Primary text | `#e5e7eb` (gray-200) |
| **Muted** | Secondary text | `#9ca3af` (gray-400) |

---

## 📝 Input Fields

### Style
```css
/* NO BORDER - chỉ background */
background: rgb(31 41 55);  /* gray-800 */
border: none;
color: white;
```

### States
- **Default**: `bg-gray-800`
- **Hover**: `bg-gray-700` (darker)
- **Focus**: `bg-gray-700` + `ring-1 ring-emerald-600`
- **Disabled**: `bg-gray-900` + `text-gray-600`

### Example
```tsx
<Input
  placeholder="Tìm kiếm..."
  style={{
    backgroundColor: "rgb(31 41 55)",  // gray-800
    border: "none",
    color: "white",
  }}
/>
```

---

## 📊 Tables

### Features
- ✅ **Compact size** (`size="small"`)
- ✅ **No excessive borders** (only column dividers)
- ✅ **Hover rows** (bg-gray-800)
- ✅ **20 items per page** (dense display)
- ✅ **No padding waste** (tight spacing)

### Column Formatting
```tsx
{
  title: "ID",
  dataIndex: "id",
  width: 80,
  render: (id: string) => (
    <span className="text-xs text-gray-500">
      {id.slice(0, 8)}...
    </span>
  ),
}
```

### Status Badges
```tsx
<span className="font-semibold">
  {status === "completed" && "✓ Hoàn thành"}
  {status === "pending" && "⏳ Đang quét"}
  {status === "failed" && "✗ Lỗi"}
</span>
```

---

## 🔘 Buttons

### Primary (Action)
```tsx
<Button type="primary" size="small" icon={<Plus size={16} />}>
  Thêm
</Button>
```
- Green `#10b981`
- Hover: darker green `#059669`

### Secondary (Ghost)
```tsx
<Button type="text" size="small">
  Xem tất cả
</Button>
```
- Transparent, gray text
- Hover: slightly darker

### Danger
```tsx
<Button danger size="small" icon={<Trash2 size={16} />} />
```
- Red hover effect

---

## 📐 Spacing & Layout

### Page Layout
```tsx
<div className="space-y-4 h-full flex flex-col">
  {/* Search bar */}
  <div className="flex gap-3">
    <Input className="flex-1 max-w-sm" />
    <Button type="primary" icon={<Plus size={16} />} />
  </div>

  {/* Table (grows to fill space) */}
  <div className="flex-1 overflow-auto">
    <Table />
  </div>
</div>
```

### Gaps
- Between sections: `space-y-4` (1rem)
- Between buttons: `gap-3` (0.75rem)

---

## 🎯 Card Headers

### Minimal Header Style
```tsx
<Card
  title={
    <div className="flex items-center gap-2">
      <Icon size={16} className="text-emerald-500" />
      <span className="text-sm">Title</span>
    </div>
  }
  size="small"
>
```

---

## 🏷️ Status Indicators

| Status | Color | Icon |
|--------|-------|------|
| Completed | Emerald | ✓ |
| Pending | Blue | ⏳ |
| Failed | Red | ✗ |
| Active | Green | ● |
| Disabled | Gray | - |

---

## 📱 Responsive

- **xs** (0px): Full width
- **sm** (640px): 2 columns
- **lg** (1024px): 3 columns

```tsx
<Row gutter={16}>
  <Col xs={24} sm={12} lg={8}>
    <Card />
  </Col>
</Row>
```

---

## 🎨 Dark Mode Theme (Ant Design)

```typescript
const theme = {
  token: {
    colorPrimary: "#10b981",           // Emerald
    colorBgContainer: "#1f2937",       // Gray-900
    colorBorder: "#374151",            // Gray-700
    colorTextBase: "#e5e7eb",          // Gray-200
    borderRadius: 6,
  },
};
```

---

## ❌ What NOT to Do

- ❌ Add thick borders to inputs
- ❌ Use bright colors for backgrounds
- ❌ Add too much padding/spacing
- ❌ Mix different table row heights
- ❌ Use serif fonts
- ❌ Add shadows/glows
- ❌ Use uppercase text everywhere
- ❌ Rounded corners > 8px

---

## ✅ Best Practices

- ✅ Use semantic colors (emerald for primary)
- ✅ Keep contrast ratio > 4.5:1 (WCAG)
- ✅ Use subtle hover effects
- ✅ Align icons with text (size 16px)
- ✅ Use `text-xs` for IDs/secondary text
- ✅ Consistent spacing (multiples of 4px)
- ✅ Group related actions close together
- ✅ Full-height tables with overflow

---

## 🚀 Component Library

All components from **Ant Design v5** with dark theme applied:

- Button, Input, Form, Select
- Table, Pagination, Empty
- Card, Statistic, Row/Col
- Modal, Popconfirm, Dropdown
- Message, Alert, Tooltip
- Upload, Checkbox, Radio
- DatePicker, TimePicker, etc.

---

**Last Updated:** Apr 15, 2026  
**Design Version:** 1.0
