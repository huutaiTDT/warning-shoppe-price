/** @format */

"use client";

import { Button } from "@/components/ui/button";
import { checkProductExists, fetchShopeeProductInfo } from "@/lib/shopee-utils";
import {
  AlertCircle,
  Link as LinkIcon,
  Loader,
  Package,
  Save,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductModal({ onClose, onSuccess }: AddProductModalProps) {
  const [step, setStep] = useState<"url" | "details">("url");
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existsWarning, setExistsWarning] = useState(false);
  const [shops, setShops] = useState<any[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    priceMin: "",
    priceMax: "",
    image: "",
    thumbnail: "",
    brand: "",
    rating: "0",
    sold: "0",
    original_price: "",
    description: "",
    aff_link: "",
    external_id: "",
    shop_id: "",
  });

  // Fetch shops on mount
  useEffect(() => {
    const fetchShops = async () => {
      try {
        const res = await fetch("/api/shops?page=1&limit=1000");
        const data = await res.json();
        setShops(data.shops || []);
        // Set first shop as default
        if (data.shops && data.shops.length > 0) {
          setFormData((prev) => ({ ...prev, shop_id: data.shops[0].id }));
        }
      } catch (err) {
        console.error("Error fetching shops:", err);
      } finally {
        setShopsLoading(false);
      }
    };
    fetchShops();
  }, []);

  const handleExtractFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setExistsWarning(false);
    setLoading(true);

    try {
      if (!shopeeUrl.trim()) {
        setError("Vui lòng nhập URL Shopee");
        return;
      }

      const result = await fetchShopeeProductInfo(shopeeUrl);

      if ("error" in result) {
        setError(result.error);
        return;
      }

      // Check if product already exists
      const productExists = await checkProductExists(result.id);
      if (productExists) {
        setExistsWarning(true);
        setError("");
      }

      // Pre-fill form with extracted data
      setFormData((prev) => ({
        ...prev,
        external_id: result.id,
        aff_link: result.aff_link,
        name: result.name || "",
        priceMin: result.priceMin?.toString() || "",
        priceMax: result.priceMax?.toString() || "",
        image: result.image || result.thumbnail || "",
        thumbnail: result.thumbnail || "",
        brand: result.brand || "",
        rating: result.rating?.toString() || "0",
        sold: result.sold?.toString() || "0",
        description: result.description || "",
      }));

      setStep("details");
    } catch (err) {
      setError("Lỗi khi lấy thông tin sản phẩm");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const priceMin = parseFloat(formData.priceMin);
      const priceMax = parseFloat(formData.priceMax);

      if (!formData.name.trim()) {
        setError("Vui lòng nhập tên sản phẩm");
        return;
      }

      if (!formData.shop_id) {
        setError("Vui lòng chọn cửa hàng");
        return;
      }

      if (isNaN(priceMin) || isNaN(priceMax)) {
        setError("Vui lòng nhập giá hợp lệ");
        return;
      }

      if (priceMin > priceMax) {
        setError("Giá tối thiểu phải nhỏ hơn giá tối đa");
        return;
      }

      const res = await fetch("/api/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          priceMin,
          priceMax,
          image: formData.image || null,
          rating: parseFloat(formData.rating) || 0,
          sold: parseInt(formData.sold) || 0,
          original_price:
            formData.original_price ? parseFloat(formData.original_price) : 0,
          aff_link: formData.aff_link,
          description: formData.description || null,
          external_id: formData.external_id,
          shop_id: formData.shop_id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Lỗi khi tạo sản phẩm");
        return;
      }

      alert("✅ Sản phẩm đã được thêm thành công!");
      onSuccess();
      onClose();
    } catch (err) {
      setError("Lỗi khi tạo sản phẩm");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
      <div className='bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Package size={20} className='text-emerald-400' />
            <h2 className='text-lg font-bold text-slate-100'>
              {step === "url" ? "Nhập Shopee Link" : "Thêm sản phẩm mới"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-200 transition'>
            <X size={20} />
          </button>
        </div>

        {/* STEP 1: URL Input */}
        {step === "url" && (
          <form onSubmit={handleExtractFromUrl} className='space-y-4'>
            <div>
              <label className='block text-xs font-semibold text-slate-400 mb-2'>
                <div className='flex items-center gap-1'>
                  <LinkIcon size={14} />
                  Shopee Link
                </div>
              </label>
              <input
                type='url'
                value={shopeeUrl}
                onChange={(e) => setShopeeUrl(e.target.value)}
                placeholder='https://shopee.vn/shop-name.123456/p/product-name.987654'
                disabled={loading}
                className='w-full h-10 bg-slate-800 border border-slate-700 rounded px-3 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-600'
              />
              <p className='text-xs text-slate-500 mt-2'>
                Hệ thống sẽ lấy thông tin sản phẩm từ link Shopee và tự động
                điền vào form
              </p>
            </div>

            {error && (
              <div className='rounded bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20 flex items-center gap-2'>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {existsWarning && (
              <div className='rounded bg-yellow-500/10 p-3 text-xs text-yellow-400 border border-yellow-500/20 flex items-center gap-2'>
                <AlertCircle size={16} />
                Sản phẩm này đã tồn tại trong hệ thống. Bạn có muốn thêm bản sao
                không?
              </div>
            )}

            <div className='flex gap-2 justify-end pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={onClose}
                disabled={loading}
                size='sm'
                className='text-xs h-8'>
                Hủy
              </Button>
              <Button
                type='submit'
                disabled={loading || !shopeeUrl.trim()}
                size='sm'
                className='text-xs h-8 bg-emerald-600 hover:bg-emerald-700'>
                {loading ?
                  <>
                    <Loader size={14} className='animate-spin mr-1' />
                    Đang tải...
                  </>
                : <>
                    <LinkIcon size={14} className='mr-1' />
                    Tiếp tục
                  </>
                }
              </Button>
            </div>
          </form>
        )}

        {/* STEP 2: Product Details */}
        {step === "details" && (
          <form onSubmit={handleSubmit} className='space-y-3'>
            <div className='grid grid-cols-2 gap-3'>
              {/* Cửa hàng */}
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Cửa hàng *
                </label>
                <select
                  value={formData.shop_id}
                  onChange={(e) =>
                    setFormData({ ...formData, shop_id: e.target.value })
                  }
                  required
                  disabled={loading || shopsLoading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'>
                  <option value=''>
                    {shopsLoading ? "Đang tải cửa hàng..." : "Chọn cửa hàng"}
                  </option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tên sản phẩm */}
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Tên sản phẩm *
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Nhập tên sản phẩm'
                  required
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {formData.brand && (
                <div className='col-span-2'>
                  <label className='block text-xs font-semibold text-slate-400 mb-1'>
                    Thương hiệu
                  </label>
                  <input
                    type='text'
                    value={formData.brand}
                    readOnly
                    className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-300'
                  />
                </div>
              )}

              {/* Giá tối thiểu */}
              <div>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Giá tối thiểu *
                </label>
                <input
                  type='number'
                  value={formData.priceMin}
                  onChange={(e) =>
                    setFormData({ ...formData, priceMin: e.target.value })
                  }
                  placeholder='0'
                  required
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {/* Giá tối đa */}
              <div>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Giá tối đa *
                </label>
                <input
                  type='number'
                  value={formData.priceMax}
                  onChange={(e) =>
                    setFormData({ ...formData, priceMax: e.target.value })
                  }
                  placeholder='0'
                  required
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {/* Giá niêm yết */}
              <div>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Giá niêm yết
                </label>
                <input
                  type='number'
                  value={formData.original_price}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      original_price: e.target.value,
                    })
                  }
                  placeholder='0'
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {/* Đánh giá */}
              <div>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Đánh giá (⭐)
                </label>
                <input
                  type='number'
                  min='0'
                  max='5'
                  step='0.1'
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData({ ...formData, rating: e.target.value })
                  }
                  placeholder='4.5'
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {/* Số lượng đã bán */}
              <div>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Đã bán
                </label>
                <input
                  type='number'
                  value={formData.sold}
                  onChange={(e) =>
                    setFormData({ ...formData, sold: e.target.value })
                  }
                  placeholder='100'
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {/* Link hình ảnh */}
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Link hình ảnh
                </label>
                <input
                  type='url'
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  placeholder='https://...'
                  disabled={loading}
                  className='w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>

              {/* Mô tả */}
              <div className='col-span-2'>
                <label className='block text-xs font-semibold text-slate-400 mb-1'>
                  Mô tả
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder='Nhập mô tả sản phẩm...'
                  disabled={loading}
                  rows={3}
                  className='w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600'
                />
              </div>
            </div>

            {error && (
              <div className='rounded bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20 flex items-center gap-2'>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {existsWarning && (
              <div className='rounded bg-yellow-500/10 p-3 text-xs text-yellow-400 border border-yellow-500/20 flex items-center gap-2'>
                <AlertCircle size={16} />
                Sản phẩm này đã tồn tại trong hệ thống
              </div>
            )}

            <div className='flex gap-2 justify-end pt-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setStep("url");
                  setError("");
                  setExistsWarning(false);
                }}
                disabled={loading}
                size='sm'
                className='text-xs h-8'>
                Quay lại
              </Button>
              <Button
                type='submit'
                disabled={loading}
                size='sm'
                className='text-xs h-8 bg-emerald-600 hover:bg-emerald-700'>
                {loading ?
                  <>
                    <Loader size={14} className='animate-spin mr-1' />
                    Đang lưu...
                  </>
                : <>
                    <Save size={14} className='mr-1' />
                    Thêm sản phẩm
                  </>
                }
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
