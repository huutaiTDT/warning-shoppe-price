/** @format */

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Store,
  Package,
  TrendingDown,
  ChevronRight,
} from "lucide-react";

export default function DashboardPage() {
  const [totalShops, setTotalShops] = useState<number | null>(null);
  const [totalProducts, setTotalProducts] = useState<number | null>(null);
  const [crawlHistoryCount, setCrawlHistoryCount] = useState<number | null>(
    null,
  );
  const [productsUnderPrice, setProductsUnderPrice] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ================= FETCH STATS =================
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [shopsRes, productsRes] = await Promise.all([
          fetch("/api/shops?page=1&limit=1"),
          fetch("/api/products?page=1&limit=1"),
        ]);

        const shopsData = await shopsRes.json();
        const productsData = await productsRes.json();

        setTotalShops(shopsData.total || 0);
        setTotalProducts(productsData.total || 0);
        setCrawlHistoryCount(productsData.total || 0);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  // ================= FETCH PRODUCTS UNDER PRICE =================
  useEffect(() => {
    const fetchUnderPriceProducts = async () => {
      try {
        const res = await fetch(
          "/api/products?page=1&limit=20&underOriginal=true",
        );
        const data = await res.json();
        setProductsUnderPrice(data.products || []);
      } catch (error) {
        console.error("Error fetching under price products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchUnderPriceProducts();
  }, []);

  return (
    <div className="space-y-4">
      {/* ================= STATISTICS =================  */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Shops */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">
              Tổng cửa hàng
            </span>
            <Store size={20} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {loadingStats ? "..." : totalShops}
          </p>
          <Link href="/dashboard/shops">
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs h-7 text-slate-400 hover:text-slate-200">
              Xem tất cả <ChevronRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>

        {/* Products */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">
              Tổng sản phẩm
            </span>
            <Package size={20} className="text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {loadingStats ? "..." : totalProducts}
          </p>
          <Link href="/dashboard/products">
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs h-7 text-slate-400 hover:text-slate-200">
              Xem tất cả <ChevronRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>

        {/* Crawl History */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">
              Lịch sử quét
            </span>
            <BarChart3 size={20} className="text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-slate-200">
            {loadingStats ? "..." : crawlHistoryCount}
          </p>
          <Link href="/dashboard/crawl-history">
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-3 text-xs h-7 text-slate-400 hover:text-slate-200">
              Xem tất cả <ChevronRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* ================= PRODUCTS UNDER PRICE TABLE =================  */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg">
        <div className="border-b border-slate-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-yellow-400" />
            <h2 className="text-sm font-semibold text-slate-200">
              Sản phẩm dưới giá niêm yết
            </h2>
          </div>
          {loadingProducts && (
            <span className="animate-spin text-xs">⏳</span>
          )}
        </div>

        {productsUnderPrice.length === 0 && !loadingProducts ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Không có sản phẩm nào dưới giá niêm yết
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Tên sản phẩm
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Giá hiện tại
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Giá niêm yết
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Giảm giá
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Đánh giá
                  </th>
                </tr>
              </thead>
              <tbody>
                {productsUnderPrice.map((product, idx) => (
                  <tr
                    key={product.id}
                    className={
                      idx % 2 === 0 ? "bg-slate-900" : "bg-slate-800/50"
                    }>
                    <td className="px-4 py-2 text-slate-300 truncate max-w-xs">
                      {product.name}
                    </td>
                    <td className="px-4 py-2 text-emerald-400 font-semibold">
                      {product.priceMin.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-slate-400 line-through">
                      {product.priceOriginal.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {product.discount > 0 && (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs font-semibold">
                          -{product.discount}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-yellow-400">
                      ★ {product.rating?.toFixed(1) || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-800 p-4">
          <Link href="/dashboard/products">
            <Button
              size="sm"
              className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700">
              Xem tất cả sản phẩm <ChevronRight size={14} className="ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
