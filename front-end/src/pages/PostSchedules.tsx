/** @format */

import { postSchedulesAPI } from "@/services/api";
import { Button, Input, Popconfirm, Space, Table, Tag, message } from "antd";
import dayjs from "dayjs";
import { Edit, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const STATUS_COLOR_MAP: Record<string, string> = {
  draft: "default",
  scheduled: "blue",
  running: "processing",
  completed: "green",
  partial_failed: "gold",
  failed: "red",
  cancelled: "default",
};

export default function PostSchedulesPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const fetchSchedules = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await postSchedulesAPI.list(page, limit, search || undefined);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      message.error("Lỗi tải danh sách lịch bài viết");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const handleDelete = async (id: string) => {
    try {
      await postSchedulesAPI.delete(id);
      message.success("Xóa lịch thành công");
      fetchSchedules(pagination.page, pagination.pageSize);
    } catch {
      message.error("Không thể xóa lịch");
    }
  };

  const handleProcessNow = async (id: string) => {
    try {
      await postSchedulesAPI.processNow(id);
      message.success("Đã đưa lịch vào hàng đợi chạy ngay");
      fetchSchedules(pagination.page, pagination.pageSize);
    } catch {
      message.error("Không thể chạy lịch ngay");
    }
  };

  const columns = [
    {
      title: "Tiêu đề",
      dataIndex: "title",
      key: "title",
      width: 260,
    },
    {
      title: "Publish",
      dataIndex: "publishDate",
      key: "publishDate",
      width: 180,
      render: (value: string) =>
        value ? dayjs(value).format("DD/MM/YYYY HH:mm") : "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 140,
      render: (value: string) => (
        <Tag color={STATUS_COLOR_MAP[value] || "default"}>{value}</Tag>
      ),
    },
    {
      title: "Targets",
      key: "targets",
      render: (_: any, record: any) => (
        <span>{(record.targets || []).length}</span>
      ),
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 180,
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<Play size={14} />}
            onClick={() => handleProcessNow(record.id)}
          />
          <Button
            icon={<Edit size={14} />}
            onClick={() =>
              navigate(`/dashboard/post-schedules/${record.id}/edit`)
            }
          />
          <Popconfirm
            title='Xóa lịch này?'
            okText='Xóa'
            cancelText='Hủy'
            onConfirm={() => handleDelete(record.id)}>
            <Button danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

  return (
    <div className='space-y-4 h-full flex flex-col'>
      <div className='bg-[#101828] border-gray-700 h-full flex flex-col overflow-hidden'>
        <div className='shrink-0 sticky top-0 z-20 flex items-center justify-between gap-3 flex-wrap bg-[#101828] border-b border-gray-800 p-2.5'>
          <Space>
            <Input
              placeholder='Tìm theo tiêu đề'
              value={search}
              onChange={(event) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSearch(event.target.value);
              }}
              style={{ width: 320 }}
            />
            <Button
              type='primary'
              icon={<Plus size={14} />}
              onClick={() => navigate("/dashboard/post-schedules/new")}>
              Tạo lịch bài viết
            </Button>
          </Space>

          <Button
            onClick={() =>
              postSchedulesAPI
                .processDue()
                .then(() =>
                  fetchSchedules(pagination.page, pagination.pageSize),
                )
            }>
            Chạy lịch đến hạn
          </Button>
        </div>

        <div className='flex-1 overflow-auto'>
          <Table
            columns={columns}
            dataSource={items}
            rowKey='id'
            loading={loading}
            pagination={false}
            scroll={{ x: 1000, y: "100%" }}
          />
        </div>

        <div className='shrink-0 sticky bottom-0 z-20 flex items-center justify-between border-t border-gray-800 bg-[#101828] p-2.5'>
          <span className='text-xs text-gray-400'>
            Hiển thị {items.length} / {total} lịch
          </span>
          <Space>
            <Button
              disabled={pagination.page === 1}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }>
              Trước
            </Button>
            <span className='text-xs text-gray-400'>
              Trang {pagination.page} / {totalPages}
            </span>
            <Button
              disabled={pagination.page >= totalPages}
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }>
              Sau
            </Button>
          </Space>
        </div>
      </div>
    </div>
  );
}
