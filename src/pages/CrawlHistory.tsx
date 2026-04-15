/** @format */

import { crawlHistoryAPI } from "@/services/api";
import { Button, Empty, Table, message } from "antd";
import { useEffect, useState } from "react";

export default function CrawlHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);

  const fetchHistory = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await crawlHistoryAPI.list(page, limit);
      setHistory(res.data.history || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(pagination.page, pagination.pageSize);
  }, [pagination]);

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      fixed: "left" as const,
      render: (id: string) => <span className="text-xs text-gray-500">{id.slice(0, 8)}...</span>,
    },
    {
      title: "Cửa hàng",
      dataIndex: "shopName",
      key: "shopName",
      width: 200,
    },
    {
      title: "Sản phẩm",
      dataIndex: "productCount",
      key: "productCount",
      width: 100,
      align: "right" as const,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (status: string) => (
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            status === "completed"
              ? "text-emerald-500"
              : status === "failed"
                ? "text-red-500"
                : "text-blue-500"
          }`}
        >
          {status === "completed"
            ? "✓ Hoàn thành"
            : status === "failed"
              ? "✗ Lỗi"
              : "⏳ Đang quét"}
        </span>
      ),
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => (
        <span className="text-xs text-gray-400">
          {new Date(date).toLocaleString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Kết thúc",
      dataIndex: "completedAt",
      key: "completedAt",
      width: 180,
      render: (date: string) =>
        date ? (
          <span className="text-xs text-gray-400">
            {new Date(date).toLocaleString("vi-VN")}
          </span>
        ) : (
          <span className="text-gray-600 text-xs">-</span>
        ),
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {history.length === 0 && !loading ? (
        <Empty description="Không có dữ liệu" />
      ) : (
        <>
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <Table
                columns={columns}
                dataSource={history}
                loading={loading}
                rowKey="id"
                pagination={false}
                scroll={{ x: 900, y: "100%" }}
                size="small"
              />
            </div>

            <div className="flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Hiển thị {history.length} / {total} mục
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="small"
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination({ ...pagination, page: pagination.page - 1 })
                    }
                  >
                    Trước
                  </Button>
                  <span className="text-xs text-gray-400">
                    Trang {pagination.page}
                  </span>
                  <Button
                    size="small"
                    disabled={
                      pagination.page * pagination.pageSize >= total
                    }
                    onClick={() =>
                      setPagination({ ...pagination, page: pagination.page + 1 })
                    }
                  >
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
