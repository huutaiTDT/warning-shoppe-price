/** @format */

"use client";

import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle,
  Loader,
  Package,
  RefreshCw,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

interface ShopProductStatusModalProps {
  shop?: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export function ShopProductStatusModal({
  shop,
  onClose,
  onRefresh,
}: ShopProductStatusModalProps) {
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (shop) {
      fetchProductCount();
    }
  }, [shop]);

  const fetchProductCount = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/shops/${shop.id}/products?count=true`);
      const data = await res.json();
      setProductCount(data.count || 0);
    } catch (err) {
      console.error("Error fetching product count:", err);
      setError("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Bạn có chắc chắn muốn đặt lại trạng thái này?")) return;

    try {
      setResetting(true);
      const res = await fetch(`/api/shops/${shop.id}/reset-product-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Lỗi khi đặt lại");
        return;
      }

      alert("✓ Đã đặt lại trạng thái");
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setError("Lỗi khi đặt lại");
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  if (!shop) return null;

  return (
    <div className='fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
      <div className='bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-md p-6'>
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Package size={20} className='text-emerald-400' />
            <h2 className='text-lg font-bold text-slate-100'>
              Trạng thái sản phẩm
            </h2>
          </div>
          <button
            onClick={onClose}
            className='text-slate-400 hover:text-slate-200 transition'>
            <X size={20} />
          </button>
        </div>

        <div className='space-y-4'>
          {/* Shop Info */}
          <div className='bg-slate-800/50 rounded p-3 border border-slate-700'>
            <p className='text-xs text-slate-400 font-semibold mb-1'>
              Cửa hàng
            </p>
            <p className='text-sm text-slate-200 font-medium'>{shop.name}</p>
            <p className='text-xs text-slate-500 mt-1'>{shop.platform}</p>
          </div>

          {/* Status */}
          <div className='bg-slate-800/50 rounded p-3 border border-slate-700'>
            <p className='text-xs text-slate-400 font-semibold mb-2'>
              Trạng thái
            </p>
            {loading ?
              <div className='flex items-center gap-2 text-slate-300'>
                <Loader size={16} className='animate-spin' />
                <span className='text-sm'>Đang tải...</span>
              </div>
            : shop.is_sys_product_by_link ?
              <div className='flex items-center gap-2 text-emerald-400'>
                <CheckCircle size={18} />
                <div>
                  <p className='text-sm font-medium'>Đã cấu hình</p>
                  <p className='text-xs text-emerald-300 mt-0.5'>
                    {productCount} sản phẩm được thêm
                  </p>
                </div>
              </div>
            : <div className='flex items-center gap-2 text-slate-400'>
                <AlertCircle size={18} />
                <p className='text-sm'>Chưa có sản phẩm nào được thêm</p>
              </div>
            }
          </div>

          {/* Product Count Details */}
          {!loading && productCount > 0 && (
            <div className='bg-emerald-500/10 rounded p-3 border border-emerald-500/20'>
              <p className='text-sm text-emerald-300'>
                ✓ Cửa hàng này có{" "}
                <span className='font-semibold'>{productCount}</span> sản phẩm
                được thêm qua chức năng kết nối link
              </p>
            </div>
          )}

          {error && (
            <div className='rounded bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20 flex items-center gap-2'>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className='pt-2 border-t border-slate-700 flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={resetting}
              size='sm'
              className='text-xs h-8 flex-1'>
              Đóng
            </Button>
            {shop.is_sys_product_by_link && (
              <Button
                type='button'
                onClick={handleReset}
                disabled={resetting}
                size='sm'
                className='text-xs h-8 flex-1 bg-slate-700 hover:bg-slate-600'>
                {resetting ?
                  <>
                    <Loader size={14} className='animate-spin mr-1' />
                    Đang đặt lại...
                  </>
                : <>
                    <RefreshCw size={14} className='mr-1' />
                    Đặt lại
                  </>
                }
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
