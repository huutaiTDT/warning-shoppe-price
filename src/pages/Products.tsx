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
  Upload,
} from 'antd';
import {
  Plus,
  Trash2,
  Edit,
  Download,
  Upload as UploadIcon,
} from 'lucide-react';
import { productsAPI } from '@/services/api';
import { formatPrice } from '@/lib/utils';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [form] = Form.useForm();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);

  const fetchProducts = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await productsAPI.list(page, limit, search || undefined);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error('Lỗi khi tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const handleAddOrEdit = async (values: any) => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, values);
        message.success('Cập nhật sản phẩm thành công');
      } else {
        await productsAPI.create(values);
        message.success('Tạo sản phẩm thành công');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingProduct(null);
      fetchProducts(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error('Lỗi khi lưu sản phẩm');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await productsAPI.delete(id);
      message.success('Xóa sản phẩm thành công');
      fetchProducts(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error('Lỗi khi xóa sản phẩm');
    }
  };

  const handleExport = async () => {
    try {
      const response = await productsAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'products.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      message.success('Xuất file thành công');
    } catch (error) {
      message.error('Lỗi khi xuất file');
    }
  };

  const handleImport = async (file: File) => {
    try {
      await productsAPI.import(file);
      message.success('Nhập file thành công');
      fetchProducts(pagination.page, pagination.pageSize);
      return false;
    } catch (error) {
      message.error('Lỗi khi nhập file');
      return false;
    }
  };

  const columns = [
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string) => <span className="truncate">{text}</span>,
    },
    {
      title: 'Giá hiện tại',
      dataIndex: 'priceMin',
      key: 'priceMin',
      width: 130,
      render: (price: number) => (
        <span className="text-emerald-500 font-semibold">
          {formatPrice(price)}
        </span>
      ),
    },
    {
      title: 'Giá niêm yết',
      dataIndex: 'priceOriginal',
      key: 'priceOriginal',
      width: 130,
      render: (price: number) => (
        <span className="text-slate-500">
          {formatPrice(price)}
        </span>
      ),
    },
    {
      title: 'Giảm giá',
      dataIndex: 'discount',
      key: 'discount',
      width: 80,
      render: (discount: number) =>
        discount > 0 ? (
          <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-semibold">
            -{discount}%
          </span>
        ) : null,
    },
    {
      title: 'Đánh giá',
      dataIndex: 'rating',
      key: 'rating',
      width: 80,
      render: (rating: number) => (
        <span className="text-yellow-500">★ {rating?.toFixed(1) || 0}</span>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button
            size="small"
            icon={<Edit size={14} />}
            onClick={() => {
              setEditingProduct(record);
              form.setFieldsValue(record);
              setIsModalVisible(true);
            }}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xóa sản phẩm?"
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
        <div className="flex gap-4 mb-4 flex-wrap">
          <Input
            placeholder="Tìm kiếm sản phẩm..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix="🔍"
            className="flex-1 min-w-200 "
          />
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingProduct(null);
              form.resetFields();
              setIsModalVisible(true);
            }}
            className="bg-emerald-600"
          >
            Thêm sản phẩm
          </Button>
          <Button
            icon={<Download size={16} />}
            onClick={handleExport}
          >
            Xuất Excel
          </Button>
          <Upload
            beforeUpload={handleImport}
            accept=".xlsx,.xls"
            showUploadList={false}
          >
            <Button icon={<UploadIcon size={16} />}>
              Nhập Excel
            </Button>
          </Upload>
        </div>

        <Table
          columns={columns}
          dataSource={products}
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
          scroll={{ x: 1200 }}
        />
      </Card>

      <Modal
        title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        open={isModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingProduct(null);
          form.resetFields();
        }}
      >
        <Form layout="vertical" form={form} onFinish={handleAddOrEdit}>
          <Form.Item
            label="Tên sản phẩm"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input placeholder="Nhập tên sản phẩm" />
          </Form.Item>

          <Form.Item
            label="Giá hiện tại"
            name="priceMin"
            rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
          >
            <Input type="number" placeholder="Nhập giá" />
          </Form.Item>

          <Form.Item
            label="Giá niêm yết"
            name="priceOriginal"
            rules={[{ required: true, message: 'Vui lòng nhập giá' }]}
          >
            <Input type="number" placeholder="Nhập giá niêm yết" />
          </Form.Item>

          <Form.Item
            label="Đánh giá"
            name="rating"
          >
            <Input type="number" min="0" max="5" step="0.1" placeholder="Nhập đánh giá" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
