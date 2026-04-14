/** @format */

"use client";

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface CrawlHistoryItem {
  id: string;
  shop_id: string;
  shops: { id: string; name: string; url: string };
  status: string;
  product_count: number;
  crawled_count: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export default function CrawlHistoryPage() {
  const [history, setHistory] = useState<CrawlHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [page]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/crawl-history?page=${page}`);
      const data = await res.json();
      setHistory(data.crawlHistory);
      setTotal(data.total);
      setPages(data.pages);
    } catch (error) {
      console.error("Error fetching crawl history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-emerald-400" />;
      case "pending":
        return <Clock size={16} className="text-yellow-400" />;
      case "failed":
        return <AlertCircle size={16} className="text-red-400" />;
      case "in_progress":
        return <PlayCircle size={16} className="text-blue-400 animate-pulse" />;
      default:
        return <Clock size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400";
      case "failed":
        return "bg-red-500/20 text-red-400";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "completed":
        return "Hoàn thành";
      case "pending":
        return "Chờ xử lý";
      case "failed":
        return "Thất bại";
      case "in_progress":
        return "Đang quét";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <h2 className="text-sm font-semibold text-slate-200">Lịch sử quét</h2>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi các hoạt động quét sản phẩm
        </p>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <p>Đang tải...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <p>Chưa có lịch sử quét.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Cửa hàng
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Tiến độ
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Bắt đầu lúc
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                    Thời gian
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => {
                  const startDate = new Date(item.started_at);
                  const endDate = item.completed_at
                    ? new Date(item.completed_at)
                    : new Date();
                  const duration = Math.round(
                    (endDate.getTime() - startDate.getTime()) / 1000,
                  );
                  const durationStr =
                    duration < 60 ? `${duration}s` : `${Math.round(duration / 60)}m`;

                  return (
                    <tr
                      key={item.id}
                      className={
                        idx % 2 === 0 ? "bg-slate-900" : "bg-slate-800/50"
                      }>
                      <td className="px-4 py-2 text-slate-300 font-medium">
                        {item.shops?.name || "Không xác định"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(
                              item.status,
                            )}`}>
                            {getStatusText(item.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-300">
                        {item.crawled_count} / {item.product_count}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {startDate.toLocaleString("vi-VN")}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {durationStr}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Button
                          size="sm"
                          className="text-xs h-7 bg-slate-800 border border-slate-700 text-slate-300 hover:text-slate-100"
                          onClick={() =>
                            setExpandedId(
                              expandedId === item.id ? null : item.id,
                            )
                          }>
                          {expandedId === item.id ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {expandedId && (
              <div className="border-t border-slate-800 p-4 bg-slate-800/30">
                <div className="max-w-2xl">
                  {(() => {
                    const item = history.find((h) => h.id === expandedId);
                    if (!item) return null;

                    return (
                      <div className="space-y-3">
                        <h3 className="font-semibold text-slate-200 text-sm">
                          Chi tiết
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <p className="text-slate-500">Cửa hàng</p>
                            <p className="text-slate-200 font-medium">
                              {item.shops?.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Trạng thái</p>
                            <p className="text-slate-200 font-medium">
                              {getStatusText(item.status)}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Tổng sản phẩm</p>
                            <p className="text-slate-200 font-medium">
                              {item.product_count}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Đã quét</p>
                            <p className="text-slate-200 font-medium">
                              {item.crawled_count}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-500">Bắt đầu</p>
                            <p className="text-slate-200 font-medium">
                              {new Date(item.started_at).toLocaleString(
                                "vi-VN",
                              )}
                            </p>
                          </div>
                          {item.completed_at && (
                            <div>
                              <p className="text-slate-500">Hoàn thành</p>
                              <p className="text-slate-200 font-medium">
                                {new Date(item.completed_at).toLocaleString(
                                  "vi-VN",
                                )}
                              </p>
                            </div>
                          )}
                        </div>

                        {item.error_message && (
                          <div className="mt-3 rounded bg-red-500/10 p-3 border border-red-500/20">
                            <p className="text-xs font-medium text-red-400 mb-1">
                              Lỗi
                            </p>
                            <p className="text-xs text-red-400/80">
                              {item.error_message}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Trang <span className="text-slate-200 font-semibold">{page}</span>{" "}
            / {pages} • Tổng cộng:{" "}
            <span className="text-slate-200 font-semibold">{total}</span> bản ghi
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              size="sm"
              className="text-xs h-8">
              <ChevronLeft size={16} />
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(Math.min(pages, page + 1))}
              disabled={page === pages}
              size="sm"
              className="text-xs h-8">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
