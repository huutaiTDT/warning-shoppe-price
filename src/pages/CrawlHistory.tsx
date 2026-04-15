import { useEffect, useState } from 'react';
import { Table, Card, message, Empty } from 'antd';
import { crawlHistoryAPI } from '@/services/api';

export default function CrawlHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);

  const fetchHistory = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await crawlHistoryAPI.list(page, limit);
      setHistory(res.data.history || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error('Lỗi khi tải lịch sử quét');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(pagination.page, pagination.pageSize);
  }, [pagination]);

  const columns = [
    {
      title: 'Cửa hàng',
      dataIndex: 'shopName',
      key: 'shopName',
      width: 200,
    },
    {
      title: 'Sản phẩm quét',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 120,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            status === 'completed'
              ? 'bg-emerald-500/20 text-emerald-500'
              : status === 'failed'
                ? 'bg-red-500/20 text-red-500'
                : 'bg-blue-500/20 text-blue-500'
          }`}
        >
          {status === 'completed'
            ? 'Hoàn thành'
            : status === 'failed'
              ? 'Lỗi'
              : 'Đang quét'}
        </span>
      ),
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) =>
        new Date(date).toLocaleString('vi-VN'),
    },
  ];

  return (
    <Card className="">
      {history.length === 0 && !loading ? (
        <Empty description="Không có lịch sử quét" />
      ) : (
        <Table
          columns={columns}
          dataSource={history}
          loading={loading}
          rowKey="id"
          pagination={{
            total,
            pageSize: pagination.pageSize,
            current: pagination.page,
            onChange: (page, pageSize) => {
              setPagination({ page, pageSize });
            },
          }}
          scroll={{ x: 700 }}
        />
      )}
    </Card>
  );
}
