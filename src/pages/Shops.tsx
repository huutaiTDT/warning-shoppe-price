/** @format */

import { shopsAPI } from "@/services/api";
import { Button, Input, Popconfirm, Space, Table, message } from "antd";
import { Edit, Play, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);

  const fetchShops = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await shopsAPI.list(page, limit, search || undefined);
      setShops(res.data.shops || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const handleDelete = async (id: string) => {
    try {
      await shopsAPI.delete(id);
      message.success("Xóa thành công");
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Lỗi xóa");
    }
  };

  const handleCrawl = async (id: string) => {
    try {
      await shopsAPI.crawl(id);
      message.success("Bắt đầu quét");
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Lỗi quét");
    }
  };

  const handleResetStatus = async (id: string) => {
    try {
      await shopsAPI.resetProductStatus(id);
      message.success("Đặt lại thành công");
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Lỗi");
    }
  };

  const columns = [
    {
      title: "Tên cửa hàng",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      width: 250,
      render: (url: string) => (
        <a
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          className='text-emerald-500 hover:text-emerald-400 text-xs truncate'>
          {url}
        </a>
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "productCount",
      key: "productCount",
      width: 80,
      align: "right" as const,
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => (
        <span className='text-xs text-gray-400'>
          {new Date(date).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size='large'>
          <Button
            type='primary'
            size='large'
            icon={<Play size={14} />}
            onClick={() => handleCrawl(record.id)}
          />
          <Button
            size='large'
            icon={<RotateCcw size={14} />}
            onClick={() => handleResetStatus(record.id)}
          />
          <Link to={`/dashboard/shops/${record.id}`}>
            <Button size='large' icon={<Edit size={14} />} />
          </Link>
          <Popconfirm
            title='Xóa?'
            onConfirm={() => handleDelete(record.id)}
            okText='Có'
            cancelText='Không'>
            <Button danger size='large' icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className='space-y-4 h-full flex flex-col'>
      <div className='flex justify-start items-center flex-wrap'>
        <Input
          placeholder='Tìm kiếm cửa hàng...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='flex-1 max-w-sm text-sm'
          style={{
            backgroundColor: "rgb(31 41 55)",
            border: "none",
            color: "white",
          }}
        />
        <Link to='/dashboard/shops/new'>
          <Button type='primary' icon={<Plus />}>
            Thêm
          </Button>
        </Link>
      </div>

      <div className='flex-1 overflow-hidden flex flex-col'>
        <div className='flex-1 overflow-auto'>
          <Table
            columns={columns}
            dataSource={shops}
            loading={loading}
            rowKey='id'
            pagination={false}
            scroll={{ x: 1200, y: "100%" }}
            size='large'
          />
        </div>

        <div className='flex-shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-gray-400'>
              Hiển thị {shops.length} / {total} mục
            </span>
            <div className='flex items-center gap-2'>
              <Button
                size='large'
                disabled={pagination.page === 1}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page - 1 })
                }>
                Trước
              </Button>
              <span className='text-xs text-gray-400'>
                Trang {pagination.page}
              </span>
              <Button
                size='large'
                disabled={pagination.page * pagination.pageSize >= total}
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.page + 1 })
                }>
                Sau
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
