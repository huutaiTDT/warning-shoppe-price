import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';

interface ShopsTableProps {
  shops: any[];
  loading: boolean;
  onEdit: (shop: any) => void;
  onDelete: (id: string) => void;
}

export function ShopsTable({ shops, loading, onEdit, onDelete }: ShopsTableProps) {
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
              Ngày tạo
            </th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">
              Thao tác
            </th>
          </tr>
        </thead>
        <tbody>
          {shops.map((shop, idx) => (
            <tr key={shop.id} className={idx % 2 === 0 ? 'bg-slate-900' : 'bg-slate-800/50'}>
              <td className="px-4 py-2 text-slate-300 font-medium">{shop.name}</td>
              <td className="px-4 py-2 text-slate-400">{shop.platform}</td>
              <td className="px-4 py-2 text-slate-400">
                <a href={shop.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline">
                  {new URL(shop.url).hostname}
                </a>
              </td>
              <td className="px-4 py-2 text-slate-500 text-xs">
                {new Date(shop.created_at).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-4 py-2 text-right">
                <div className="flex justify-end gap-1">
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
