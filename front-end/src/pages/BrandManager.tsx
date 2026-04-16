/** @format */

import { brandsAPI } from "@/services/api";
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function BrandManagerPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

  const fetchBrands = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await brandsAPI.list(page, limit, search || undefined);
      setBrands(res.data.brands || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error("Lỗi tải danh sách thương hiệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const openCreateModal = () => {
    setEditingBrand(null);
    form.setFieldsValue({
      code: "",
      name: "",
      description: "",
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (brand: any) => {
    setEditingBrand(brand);
    form.setFieldsValue({
      code: brand.code || "",
      name: brand.name || "",
      description: brand.description || "",
      is_active: Boolean(brand.is_active),
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingBrand?.id) {
        await brandsAPI.update(editingBrand.id, values);
        message.success("Cập nhật thương hiệu thành công");
      } else {
        await brandsAPI.create(values);
        message.success("Tạo thương hiệu thành công");
      }

      setIsModalOpen(false);
      fetchBrands(pagination.page, pagination.pageSize);
    } catch (error) {
      // validation and api errors handled by antd/api interceptor
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await brandsAPI.delete(id);
      message.success("Xóa thương hiệu thành công");
      fetchBrands(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Không thể xóa thương hiệu");
    }
  };

  const brandColumns = [
    {
      title: "Mã",
      dataIndex: "code",
      key: "code",
      width: 160,
      render: (value: string) => value || "-",
    },
    {
      title: "Tên thương hiệu",
      dataIndex: "name",
      key: "name",
      width: 260,
    },
    {
      title: "Mô tả",
      dataIndex: "description",
      key: "description",
      render: (value: string) => value || "-",
    },
    {
      title: "Trạng thái",
      dataIndex: "is_active",
      key: "is_active",
      width: 140,
      render: (active: boolean) =>
        active ? <Tag color='green'>Đang dùng</Tag> : <Tag>Ẩn</Tag>,
    },
    {
      title: "Thao tác",
      key: "actions",
      width: 160,
      render: (_: any, record: any) => (
        <Space>
          <Button
            size='middle'
            icon={<Edit size={14} />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title='Xóa thương hiệu này?'
            okText='Xóa'
            cancelText='Hủy'
            onConfirm={() => handleDelete(record.id)}>
            <Button danger size='middle' icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className='space-y-4 p-2 h-full flex flex-col'>
      <div className='bg-[#101828] border-gray-700 h-full flex flex-col overflow-hidden'>
        <div
          className='shrink-0 sticky top-0 z-20 flex items-center justify-between gap-3 flex-wrap bg-[#101828] border-b border-gray-800'
          style={{
            padding: "10px",
          }}>
          <Space>
            <Input
              placeholder='Tìm theo mã hoặc tên thương hiệu'
              value={search}
              onChange={(e) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSearch(e.target.value);
              }}
              style={{ width: 320 }}
            />
            <Button
              type='primary'
              icon={<Plus size={14} />}
              onClick={openCreateModal}>
              Thêm thương hiệu
            </Button>
          </Space>
        </div>

        <div className='flex-1 overflow-auto'>
          <Table
            columns={brandColumns}
            dataSource={brands}
            rowKey='id'
            loading={loading}
            pagination={false}
            scroll={{ x: 900, y: "100%" }}
          />
        </div>

        <div
          className='shrink-0 sticky bottom-0 z-20 flex items-center justify-between border-t border-gray-800 bg-[#101828]'
          style={{
            padding: "10px",
          }}>
          <span className='text-xs text-gray-400'>
            Hiển thị {brands.length} / {total} thương hiệu
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
        title={editingBrand ? "Cập nhật thương hiệu" : "Tạo thương hiệu"}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        okText='Lưu'
        cancelText='Hủy'
        confirmLoading={saving}>
        <Form form={form} layout='vertical'>
          <Form.Item label='Mã thương hiệu' name='code'>
            <Input placeholder='VD: APPLE' />
          </Form.Item>

          <Form.Item
            label='Tên thương hiệu'
            name='name'
            rules={[
              { required: true, message: "Vui lòng nhập tên thương hiệu" },
            ]}>
            <Input placeholder='VD: Apple' />
          </Form.Item>

          <Form.Item label='Mô tả' name='description'>
            <Input.TextArea rows={3} placeholder='Mô tả ngắn...' />
          </Form.Item>

          <Form.Item label='Kích hoạt' name='is_active' valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
