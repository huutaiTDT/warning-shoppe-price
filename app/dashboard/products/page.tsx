/** @format */

"use client";

import { AddProductModal } from "@/components/products/add-product-modal";
import { ProductsGrid } from "@/components/products/products-grid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Grid3x3,
  List,
  Plus,
  Search,
  TrendingDown,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [shop, setShop] = useState("");
  const [underOriginal, setUnderOriginal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // ================= DEBOUNCE =================
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // ================= FETCH =================
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(shop && { shop }),
        ...(underOriginal && { underOriginal: "true" }),
      });

      const res = await fetch(`/api/products?${params}`);
      const data = await res.json();

      setProducts(data.products);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, shop, underOriginal]);

  const fetchShops = useCallback(async () => {
    const res = await fetch("/api/shops?page=1&limit=1000");
    const data = await res.json();
    setShops(data.shops || []);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  // ================= EXPORT =================
  const handleExport = async () => {
    try {
      setExporting(true);

      const res = await fetch("/api/products/export");
      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = "products.xlsx";
      a.click();

      window.URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  // ================= IMPORT =================
  const handleImport = async (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);

      const formData = new FormData();
      formData.append("file", file);
      alert("Đang nhập dữ liệu... Vui lòng đợi!");
      await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      alert("Nhập dữ liệu thành công!");

      fetchProducts();
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  // ================= UI =================
  return (
    <div className='space-y-3'>
      {/* Toolbar */}
      <div className='bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-3'>
        {/* Row 1: Search and Filters */}
        <div className='flex flex-col md:flex-row gap-2 items-center'>
          <div className='relative flex-1'>
            <Search
              size={16}
              className='absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500'
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder='Tìm kiếm sản phẩm...'
              className='pl-8 h-8 text-xs bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500'
            />
          </div>

          <select
            value={shop}
            onChange={(e) => setShop(e.target.value)}
            className='h-8 px-2 rounded text-xs bg-slate-800 border border-slate-700 text-slate-200'>
            <option value=''>Tất cả cửa hàng</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <Button
            variant={underOriginal ? "default" : "outline"}
            onClick={() => setUnderOriginal(!underOriginal)}
            disabled={loading}
            size='sm'
            className='text-xs h-8 bg-slate-800 border-slate-700 text-slate-300 hover:text-slate-100'>
            <TrendingDown size={16} className='mr-1' />
            Dưới niêm yết
          </Button>
        </div>

        {/* Row 2: Actions and View */}
        <div className='flex gap-2 justify-between items-center'>
          <div className='flex gap-2'>
            <Button
              onClick={() => setShowAddModal(true)}
              size='sm'
              className='text-xs h-8 bg-emerald-600 hover:bg-emerald-700'
              title='Thêm sản phẩm mới'>
              <Plus size={16} className='mr-1' />
              Thêm sản phẩm
            </Button>

            <Button
              onClick={handleExport}
              disabled={exporting}
              size='sm'
              className='text-xs h-8 bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100'
              title='Tải xuống'>
              <Download size={16} className='mr-1' />
              {exporting ? "..." : "Tải xuống"}
            </Button>

            <label className='cursor-pointer'>
              <input
                type='file'
                accept='.xlsx'
                hidden
                onChange={handleImport}
              />
              <Button
                asChild
                disabled={importing}
                size='sm'
                className='text-xs h-8 bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100'
                title='Nhập từ Excel'>
                <span>
                  <Upload size={16} className='mr-1' />
                  {importing ? "..." : "Nhập"}
                </span>
              </Button>
            </label>
          </div>

          <div className='flex gap-2'>
            <Button
              size='sm'
              variant={viewMode === "grid" ? "default" : "outline"}
              onClick={() => setViewMode("grid")}
              className='text-xs h-8'
              title='Lưới'>
              <Grid3x3 size={16} />
            </Button>
            <Button
              size='sm'
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className='text-xs h-8'
              title='Danh sách'>
              <List size={16} />
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className='flex items-center justify-between text-xs text-slate-400'>
          <p>
            {loading && <span className='animate-spin mr-2'>⏳</span>}
            Hiển thị{" "}
            <span className='text-slate-200 font-semibold'>
              {products?.length > 0 ? (page - 1) * 25 + 1 : 0} -{" "}
              {Math.min(page * 25, total)}
            </span>{" "}
            / {total} sản phẩm
          </p>
          {pages > 1 && (
            <p>
              Trang <span className='text-slate-200 font-semibold'>{page}</span>{" "}
              / {pages}
            </p>
          )}
        </div>
      </div>

      {/* Grid/List */}
      <ProductsGrid
        products={products}
        loading={loading}
        viewMode={viewMode}
        onSelectProduct={setSelectedProduct}
      />

      {/* Pagination */}
      {pages > 1 && (
        <div className='flex justify-center gap-2 py-3'>
          <Button
            variant='outline'
            disabled={page === 1 || loading}
            onClick={() => setPage(page - 1)}
            size='sm'
            className='text-xs h-8'>
            <ChevronLeft size={16} />
          </Button>

          <div className='px-3 py-1.5 border border-slate-700 rounded bg-slate-800 text-slate-300 text-xs'>
            {page}/{pages}
          </div>

          <Button
            variant='outline'
            disabled={page === pages || loading}
            onClick={() => setPage(page + 1)}
            size='sm'
            className='text-xs h-8'>
            <ChevronRight size={16} />
          </Button>
        </div>
      )}

      {/* Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => fetchProducts()}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}

// ================= MODAL =================
function ProductDetailModal({ product, onClose }: any) {
  const thumbnail = getProductThumbnail(product);
  const brand = getProductBrand(product);

  return (
    <div
      className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50'
      onClick={onClose}>
      <div
        className='bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-lg p-6 space-y-4 animate-in zoom-in-95 translate-y-0'
        onClick={(e) => e.stopPropagation()}>
        <div className='flex justify-between items-start'>
          <h2 className='text-lg font-semibold text-slate-100'>
            {product.name}
          </h2>
          <button
            className='text-slate-400 hover:text-slate-200 transition'
            onClick={onClose}>
            ✕
          </button>
        </div>

        <div className='grid md:grid-cols-2 gap-4'>
          {thumbnail && (
            <img
              src={thumbnail}
              loading='lazy'
              className='rounded-lg object-cover w-full h-60 bg-slate-800'
            />
          )}

          <div className='space-y-3 text-sm text-slate-300'>
            <div>
              <p className='text-slate-500 text-xs mb-1'>💰 Giá</p>
              <p className='text-lg font-semibold text-emerald-400'>
                {product.priceMin} - {product.priceMax}
              </p>
            </div>

            <div className='flex gap-4 flex-wrap'>
              <div>
                <p className='text-slate-500 text-xs mb-1'>⭐ Đánh giá</p>
                <p className='font-semibold text-yellow-400'>
                  {product.rating.toFixed(1)} ({product.sold} đã bán)
                </p>
              </div>
              {product.shopName && (
                <div>
                  <p className='text-slate-500 text-xs mb-1'>🏪 Cửa hàng</p>
                  <p className='font-semibold'>{product.shopName}</p>
                </div>
              )}
              {brand && (
                <div>
                  <p className='text-slate-500 text-xs mb-1'>🏷 Thương hiệu</p>
                  <p className='font-semibold'>{brand}</p>
                </div>
              )}
            </div>

            {product.priceOriginal > 0 && (
              <>
                <div>
                  <p className='text-slate-500 text-xs mb-1'>📌 Giá niêm yết</p>
                  <p className='font-semibold text-slate-400 line-through'>
                    {product.priceOriginal}
                  </p>
                </div>
                <p className='text-xs text-slate-500'>
                  {product.priceTrend === "down" && "↓ Giá tốt"}
                  {product.priceTrend === "up" && "↑ Giá cao"}
                  {product.priceTrend === "equal" && "= Giá tương đương"}
                </p>
              </>
            )}

            {product.discount > 0 && (
              <span className='inline-block bg-red-500/20 text-red-400 px-3 py-1 rounded text-xs font-semibold'>
                🔥 Giảm {product.discount}%
              </span>
            )}
          </div>
        </div>

        {product.aff_link && (
          <Button
            className='w-full bg-emerald-600 hover:bg-emerald-700'
            asChild>
            <a href={product.aff_link} target='_blank'>
              Xem sản phẩm
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}

const getGalleryFirst = (gallery: unknown) => {
  if (!gallery) return "";
  if (Array.isArray(gallery)) {
    return typeof gallery[0] === "string" ? gallery[0] : "";
  }
  if (typeof gallery === "string") {
    try {
      const parsed = JSON.parse(gallery);
      if (Array.isArray(parsed)) {
        return typeof parsed[0] === "string" ? parsed[0] : "";
      }
    } catch {
      return "";
    }
  }
  return "";
};

const getProductThumbnail = (product: any) => {
  const candidates = [
    product?.thumbnail,
    product?.thumb,
    product?.image,
    product?.image_url,
    product?.raw?.thumbnail,
    product?.raw?.image,
    product?.raw?.image_url,
    getGalleryFirst(product?.gallery),
    getGalleryFirst(product?.raw?.gallery),
    getGalleryFirst(product?.raw?.images),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
};

const getProductBrand = (product: any) => {
  const candidates = [
    product?.brand,
    product?.brand_name,
    product?.brandName,
    product?.raw?.brand,
    product?.raw?.brand_name,
    product?.raw?.brandName,
    product?.raw?.brand?.name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return "";
};
