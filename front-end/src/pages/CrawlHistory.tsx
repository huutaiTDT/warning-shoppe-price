/** @format */

import { crawlHistoryAPI } from "@/services/api";
import { Button, Empty, Table, message } from "antd";
import { useEffect, useState } from "react";

const normalizeHistoryItem = (item: any) => ({
  ...item,
  shopName: item.shopName ?? item.shop_name ?? item.shops?.name ?? "Không rõ",
  productCount: Number(item.productCount ?? item.product_count ?? 0),
  crawledCount: Number(item.crawledCount ?? item.crawled_count ?? 0),
  createdAt: item.createdAt ?? item.started_at ?? item.created_at,
  completedAt: item.completedAt ?? item.completed_at,
  errorMessage: item.errorMessage ?? item.error_message ?? "",
});

export default function CrawlHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

  const fetchHistory = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await crawlHistoryAPI.list(page, limit);
      setHistory((res.data.history || []).map(normalizeHistoryItem));
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
      title: "Đã crawl",
      dataIndex: "crawledCount",
      key: "crawledCount",
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
            status === "completed" ? "text-emerald-500"
            : status === "failed" ? "text-red-500"
            : "text-blue-500"
          }`}>
          {status === "completed" ?
            "✓ Hoàn thành"
          : status === "failed" ?
            "✗ Lỗi"
          : "⏳ Đang quét"}
        </span>
      ),
    },
    {
      title: "Lỗi",
      dataIndex: "errorMessage",
      key: "errorMessage",
      width: 260,
      render: (text: string) =>
        text ?
          <span className='text-xs text-red-400'>{text}</span>
        : <span className='text-gray-600 text-xs'>-</span>,
    },
    {
      title: "Thời gian",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => (
        <span className='text-xs text-gray-400'>
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
        date ?
          <span className='text-xs text-gray-400'>
            {new Date(date).toLocaleString("vi-VN")}
          </span>
        : <span className='text-gray-600 text-xs'>-</span>,
    },
  ];

  return (
    <div className='h-full flex flex-col'>
      {history.length === 0 && !loading ?
        <Empty description='Không có dữ liệu' />
      : <>
          <div className='flex-1 overflow-hidden flex flex-col'>
            <div className='flex-1 overflow-auto'>
              <Table
                columns={columns}
                dataSource={history}
                loading={loading}
                rowKey='id'
                pagination={false}
                scroll={{ x: 900, y: "100%" }}
                size='large'
              />
            </div>

            <div className='shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3'>
              <div className='flex items-center justify-between'>
                <span className='text-xs text-gray-400'>
                  Hiển thị {history.length} / {total} mục
                </span>
                <div className='flex items-center gap-2'>
                  <Button
                    size='large'
                    disabled={pagination.page === 1}
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: pagination.page - 1,
                      })
                    }>
                    Trước
                  </Button>
                  <span className='text-xs text-gray-400'>
                    Trang {pagination.page}/{totalPages}
                  </span>
                  <Button
                    size='large'
                    disabled={pagination.page * pagination.pageSize >= total}
                    onClick={() =>
                      setPagination({
                        ...pagination,
                        page: pagination.page + 1,
                      })
                    }>
                    Sau
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      }
    </div>
  );
}
