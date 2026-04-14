import { Button } from '@/components/ui/button';
import { CheckCircle, Edit2, Info, Link2, Loader, Trash2, Zap } from 'lucide-react';
import { useState } from 'react';

interface ShopsTableProps {
  shops: any[];
  loading: boolean;
  onEdit: (shop: any) => void;
  onDelete: (id: string) => void;
  onStatusClick: (shop: any) => void;
  onCrawl?: (shopId: string) => Promise<void>;
}

export function ShopsTable({
  shops,
  loading,
  onEdit,
  onDelete,
  onStatusClick,
  onCrawl
}: ShopsTableProps) {
  const [crawlingIds, setCrawlingIds] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Đang tải...</p>
      </div>
    );
  }

  if (shops.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Chưa có cửa hàng nào. Tạo một cửa hàng để bắt đầu!</p>
      </div>
    );
  }

  const handleCrawl = async (e: React.MouseEvent, shopId: string) => {
    e.stopPropagation();
    if (!onCrawl) return;

    setCrawlingIds(new Set([...crawlingIds, shopId]));
    try {
      await onCrawl(shopId);
    } finally {
      setCrawlingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(shopId);
        return newSet;
      });
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-800/50">
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
              Tên
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
              Nền tảng
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
              URL
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
              Trạng thái
            </th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
              Ngày tạo
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {shops.map((shop, idx) => {
            const isCrawling = crawlingIds.has(shop.id);
            return (
              <tr key={shop.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'}>
                <td className="px-4 py-2 text-slate-300 font-medium">{shop.name}</td>
                <td className="px-4 py-2 text-slate-400">{shop.platform}</td>
                <td className="px-4 py-2 text-slate-400">
                  <a href={shop.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                    {new URL(shop.url).hostname}
                  </a>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => onStatusClick(shop)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded hover:bg-slate-700/50 transition"
                    title="Xem chi tiết">
                    {shop.is_sys_product_by_link ? (
                      <>
                        <CheckCircle size={16} className="text-emerald-400" />
                        <span className="text-emerald-400">Đã cấu hình</span>
                      </>
                    ) : (
                      <>
                        <Link2 size={16} className="text-slate-500" />
                        <span className="text-slate-500">Chưa có</span>
                      </>
                    )}
                  </button>
                </td>
                <td className="px-4 py-2 text-slate-500 text-xs">
                  {new Date(shop.created_at).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    {!shop.is_sys_product_by_link && (
                      <Button
                        size="sm"
                        onClick={(e) => handleCrawl(e, shop.id)}
                        disabled={isCrawling}
                        className="text-xs h-7 bg-amber-600 hover:bg-amber-700 border border-amber-500"
                        title="Sys thông tin sản phẩm">
                        {isCrawling ? (
                          <Loader size={14} className="animate-spin" />
                        ) : (
                          <Zap size={14} />
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      onClick={() => onStatusClick(shop)}
                      className="text-xs h-7 bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100"
                      title="Xem trạng thái sản phẩm">
                      <Info size={14} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onEdit(shop)}
                      className="text-xs h-7 bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100"
                      title="Chỉnh sửa">
                      <Edit2 size={14} />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onDelete(shop.id)}
                      className="text-xs h-7 bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100"
                      title="Xóa">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
