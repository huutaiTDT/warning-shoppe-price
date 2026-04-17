/** @format */

import { accountSettingsAPI } from "@/services/api";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const PLATFORM_OPTIONS = [
  { label: "Facebook", value: "facebook" },
  { label: "TikTok", value: "tiktok" },
  { label: "Threads", value: "threads" },
  { label: "Instagram", value: "instagram" },
];

export default function AccountSettingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const fetchItems = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await accountSettingsAPI.list(
        page,
        limit,
        search || undefined,
      );
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      message.error("Lỗi tải danh sách account settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const openCreateModal = () => {
    setEditingItem(null);
    form.setFieldsValue({
      name: "",
      external_id: "",
      page_id: "",
      token: "",
      platform: "facebook",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    form.setFieldsValue({
      name: item.name,
      external_id: item.external_id || "",
      page_id: item.page_id || "",
      token: "",
      platform: item.platform,
      is_active: item.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        name: values.name,
        external_id: values.external_id,
        page_id: values.page_id,
        token: values.token,
        platform: values.platform,
        is_active: values.is_active,
      };

      if (editingItem?.id) {
        await accountSettingsAPI.update(editingItem.id, payload);
        message.success("Cập nhật account setting thành công");
      } else {
        await accountSettingsAPI.create(payload);
        message.success("Tạo account setting thành công");
      }

      setIsModalOpen(false);
      fetchItems(pagination.page, pagination.pageSize);
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await accountSettingsAPI.delete(id);
      message.success("Xóa account setting thành công");
      fetchItems(pagination.page, pagination.pageSize);
    } catch {
      message.error("Không thể xóa account setting");
    }
  };

  const columns = [
    {
      title: "Tên",
      dataIndex: "name",
      key: "name",
      width: 220,
    },
    {
      title: "Platform",
      dataIndex: "platform",
      key: "platform",
      width: 140,
      render: (value: string) => <Tag color='blue'>{value}</Tag>,
    },
    {
      title: "External ID",
      dataIndex: "external_id",
      key: "external_id",
      width: 180,
      render: (value: string) => value || "-",
    },
    {
      title: "Page ID",
      dataIndex: "page_id",
      key: "page_id",
      width: 180,
      render: (value: string) => value || "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (value: boolean) =>
        value ?
          <Tag color='green'>Active</Tag>
        : <Tag color='default'>Inactive</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button
            icon={<Edit size={14} />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title='Xóa account setting này?'
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
              placeholder='Tìm theo tên / external id / page id'
              value={search}
              onChange={(event) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSearch(event.target.value);
              }}
              style={{ width: 360 }}
            />
            <Button
              type='primary'
              icon={<Plus size={14} />}
              onClick={openCreateModal}>
              Tạo account setting
            </Button>
          </Space>
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
            Hiển thị {items.length} / {total} account settings
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

      <Modal
        title={editingItem ? "Cập nhật account setting" : "Tạo account setting"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        okText='Lưu'
        cancelText='Hủy'
        confirmLoading={saving}
        width={680}>
        <Form form={form} layout='vertical'>
          <Form.Item
            label='Tên account'
            name='name'
            rules={[{ required: true, message: "Vui lòng nhập tên account" }]}>
            <Input placeholder='Ví dụ: Fanpage Mỹ phẩm A' />
          </Form.Item>

          <Form.Item
            label='Platform'
            name='platform'
            rules={[{ required: true, message: "Vui lòng chọn platform" }]}>
            <Select options={PLATFORM_OPTIONS} />
          </Form.Item>

          <Form.Item label='External ID' name='external_id'>
            <Input placeholder='ID tài khoản bên ngoài' />
          </Form.Item>

          <Form.Item label='Page ID' name='page_id'>
            <Input placeholder='Page ID (nếu có)' />
          </Form.Item>

          <Form.Item label='Token' name='token'>
            <Input.Password placeholder='Access token (để trống nếu không đổi)' />
          </Form.Item>

          <Form.Item label='Kích hoạt' name='is_active' valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
