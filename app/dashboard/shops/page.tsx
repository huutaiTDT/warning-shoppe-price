/** @format */

"use client";

import { ShopFormModal } from "@/components/shops/shop-form-modal";
import { ShopProductStatusModal } from "@/components/shops/shop-product-status-modal";
import { ShopsTable } from "@/components/shops/shops-table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [statusShop, setStatusShop] = useState<any>(null);

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
      console.error("Error fetching shops:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa cửa hàng này?")) return;

    try {
      const res = await fetch(`/api/shops/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShops(shops.filter((s) => s.id !== id));
      }
    } catch (error) {
      console.error("Error deleting shop:", error);
    }
  };

  const handleCrawl = async (shopId: string) => {
    try {
      const res = await fetch(`/api/shops/${shopId}/crawl`, { method: "POST" });

      if (!res.ok) {
        const data = await res.json();
        alert(`❌ ${data.error || "Lỗi khi sys thông tin"}`);
        return;
      }

      const data = await res.json();
      alert(`✅ ${data.message || "Sys thành công"}`);
      fetchShops();
    } catch (error) {
      console.error("Error crawling shop:", error);
      alert("❌ Lỗi khi sys thông tin");
    }
  };

  const handleSave = () => {
    setShowModal(false);
    setEditingShop(null);
    fetchShops();
  };

  return (
    <div className='space-y-3'>
      {/* Header and Controls */}
      <div className='bg-slate-900 border border-slate-800 rounded-lg p-4 flex items-center justify-between'>
        <div>
          <h2 className='text-sm font-semibold text-slate-200'>
            Quản lý cửa hàng
          </h2>
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
          onStatusClick={(shop) => setStatusShop(shop)}
          onCrawl={handleCrawl}
        />
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className='bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between'>
          <p className='text-xs text-slate-400'>
            Trang <span className='text-slate-200 font-semibold'>{page}</span> /{" "}
            {pages} • Tổng cộng:{" "}
            <span className='text-slate-200 font-semibold'>{total}</span> cửa
            hàng
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

      {statusShop && (
        <ShopProductStatusModal
          shop={statusShop}
          onClose={() => setStatusShop(null)}
          onRefresh={fetchShops}
        />
      )}
    </div>
  );
}
