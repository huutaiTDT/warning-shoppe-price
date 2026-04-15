import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Card,
  Input,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
} from 'antd';
import {
  Plus,
  Trash2,
  Edit,
  Play,
  RotateCcw,
} from 'lucide-react';
import { shopsAPI } from '@/services/api';

export default function ShopsPage() {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);

  const fetchShops = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await shopsAPI.list(page, limit, search || undefined);
      setShops(res.data.shops || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error('Lỗi khi tải danh sách cửa hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const handleAddOrEdit = async (values: any) => {
    try {
      if (editingShop) {
        await shopsAPI.update(editingShop.id, values);
        message.success('Cập nhật cửa hàng thành công');
      } else {
        await shopsAPI.create(values);
        message.success('Tạo cửa hàng thành công');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingShop(null);
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error('Lỗi khi lưu cửa hàng');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await shopsAPI.delete(id);
      message.success('Xóa cửa hàng thành công');
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error('Lỗi khi xóa cửa hàng');
    }
  };

  const handleCrawl = async (id: string) => {
    try {
      await shopsAPI.crawl(id);
      message.success('Bắt đầu quét dữ liệu');
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error('Lỗi khi quét dữ liệu');
    }
  };

  const handleResetStatus = async (id: string) => {
    try {
      await shopsAPI.resetProductStatus(id);
      message.success('Đặt lại trạng thái sản phẩm thành công');
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error('Lỗi khi đặt lại trạng thái');
    }
  };

  const columns = [
    {
      title: 'Tên cửa hàng',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: 200,
      render: (text: string) => (
        <a href={text} target="_blank" rel="noopener noreferrer" className="text-blue-500">
          {text?.slice(0, 30)}...
        </a>
      ),
    },
    {
      title: 'Sản phẩm',
      dataIndex: 'productCount',
      key: 'productCount',
      width: 100,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 250,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<Play size={14} />}
            onClick={() => handleCrawl(record.id)}
          >
            Quét
          </Button>
          <Button
            size="small"
            icon={<RotateCcw size={14} />}
            onClick={() => handleResetStatus(record.id)}
          >
            Reset
          </Button>
          <Button
            size="small"
            icon={<Edit size={14} />}
            onClick={() => {
              setEditingShop(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa cửa hàng?"
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button danger size="small" icon={<Trash2 size={14} />}>
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card className="">
        <div className="flex gap-4 mb-4">
          <Input
            placeholder="Tìm kiếm cửa hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix="🔍"
            className=""
          />
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingShop(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
            className="bg-emerald-600"
          >
            Thêm cửa hàng
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={shops}
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
          scroll={{ x: 1000 }}
        />
      </Card>

      <Modal
        title={editingShop ? 'Sửa cửa hàng' : 'Thêm cửa hàng'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingShop(null);
          form.resetFields();
        }}
      >
        <Form layout="vertical" form={form} onFinish={handleAddOrEdit}>
          <Form.Item
            label="Tên cửa hàng"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên cửa hàng' }]}
          >
            <Input placeholder="Nhập tên cửa hàng" />
          </Form.Item>

          <Form.Item
            label="URL"
            name="url"
            rules={[{ required: true, message: 'Vui lòng nhập URL' }]}
          >
            <Input placeholder="Nhập URL cửa hàng" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
