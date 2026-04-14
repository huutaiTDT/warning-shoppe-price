'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Save, Loader } from 'lucide-react';

interface ShopFormModalProps {
  shop?: any;
  onClose: () => void;
  onSave: () => void;
}

export function ShopFormModal({ shop, onClose, onSave }: ShopFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    platform: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name,
        url: shop.url,
        platform: shop.platform,
      });
    }
  }, [shop]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const method = shop ? 'PUT' : 'POST';
      const url = shop ? `/api/shops/${shop.id}` : '/api/shops';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Lỗi khi lưu cửa hàng');
        return;
      }

      onSave();
    } catch (err) {
      setError('Lỗi khi lưu cửa hàng');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">
            {shop ? 'Chỉnh sửa cửa hàng' : 'Thêm cửa hàng'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Tên cửa hàng
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nhập tên cửa hàng"
              required
              disabled={loading}
              className="w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder="https://example.com"
              required
              disabled={loading}
              className="w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Nền tảng
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
              className="w-full h-8 bg-slate-800 border border-slate-700 rounded px-2 text-sm text-slate-200 focus:outline-none focus:border-slate-600"
              required
              disabled={loading}>
              <option value="">Chọn nền tảng</option>
              <option value="shopify">Shopify</option>
              <option value="woocommerce">WooCommerce</option>
              <option value="taobao">Taobao</option>
              <option value="alibaba">Alibaba</option>
              <option value="other">Khác</option>
            </select>
          </div>

          {error && (
            <div className="rounded bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20 flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="sm"
              className="text-xs h-8">
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700">
              {loading ? (
                <>
                  <Loader size={14} className="animate-spin mr-1" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save size={14} className="mr-1" />
                  Lưu
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
