'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShopsTable } from '@/components/shops/shops-table';
import { ShopFormModal } from '@/components/shops/shop-form-modal';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);

  useEffect(() => {
    fetchShops();
  }, [page]);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/shops?page=${page}`);
      const data = await res.json();
      setShops(data.shops);
      setTotal(data.total);
      setPages(data.pages);
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa cửa hàng này?')) return;

    try {
      const res = await fetch(`/api/shops/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShops(shops.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
    }
  };

  const handleSave = async () => {
    fetchShops();
    setShowModal(false);
    setEditingShop(null);
  };

  return (
    <div className='space-y-3'>
      {/* Header and Controls */}
      <div className='bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between'>
        <div>
          <h2 className='text-sm font-semibold text-slate-200'>Quản lý cửa hàng</h2>
          <p className='text-xs text-slate-500 mt-1'>
            Quản lý các cửa hàng tiếp thị liên kết
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          size='sm'
          className='text-xs h-8 bg-emerald-600 hover:bg-emerald-700'>
          <Plus size={16} className='mr-1' />
          Thêm cửa hàng
        </Button>
      </div>

      {/* Table */}
      <div className='bg-slate-900 border border-slate-800 rounded-lg overflow-hidden'>
        <ShopsTable
          shops={shops}
          loading={loading}
          onEdit={(shop) => {
            setEditingShop(shop);
            setShowModal(true);
          }}
          onDelete={handleDelete}
        />
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className='bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between'>
          <p className='text-xs text-slate-400'>
            Trang <span className='text-slate-200 font-semibold'>{page}</span> / {pages} • Tổng cộng: <span className='text-slate-200 font-semibold'>{total}</span> cửa hàng
          </p>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              size='sm'
              className='text-xs h-8'>
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant='outline'
              onClick={() => setPage(Math.min(pages, page + 1))}
              disabled={page === pages}
              size='sm'
              className='text-xs h-8'>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {showModal && (
        <ShopFormModal
          shop={editingShop}
          onClose={() => {
            setShowModal(false);
            setEditingShop(null);
          }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
