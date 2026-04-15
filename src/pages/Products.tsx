/** @format */

import { formatPrice } from "@/lib/utils";
import { productsAPI } from "@/services/api";
import { Button, Input, Popconfirm, Space, Table, Upload, message } from "antd";
import { Download, Edit, Plus, Trash2, Upload as UploadIcon } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);

  const fetchProducts = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await productsAPI.list(page, limit, search || undefined);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  const handleDelete = async (id: string) => {
    try {
      await productsAPI.delete(id);
      message.success("Xóa thành công");
      fetchProducts(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Lỗi xóa");
    }
  };

  const handleExport = async () => {
    try {
      const response = await productsAPI.export();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "products.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentElement?.removeChild(link);
      message.success("Xuất thành công");
    } catch (error) {
      message.error("Lỗi xuất");
    }
  };

  const handleImport = async (file: File) => {
    try {
      await productsAPI.import(file);
      message.success("Nhập thành công");
      fetchProducts(pagination.page, pagination.pageSize);
      return false;
    } catch (error) {
      message.error("Lỗi nhập");
      return false;
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
      render: (id: string) => <span className="text-xs text-gray-500">{id.slice(0, 8)}...</span>,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: 250,
      render: (text: string) => <span className="truncate">{text}</span>,
    },
    {
      title: "Giá hiện tại",
      dataIndex: "priceMin",
      key: "priceMin",
      width: 120,
      render: (price: number) => (
        <span className="text-emerald-500 font-semibold">{formatPrice(price)}</span>
      ),
    },
    {
      title: "Giá gốc",
      dataIndex: "priceOriginal",
      key: "priceOriginal",
      width: 120,
      render: (price: number) => (
        <span className="text-gray-400 line-through text-sm">{formatPrice(price)}</span>
      ),
    },
    {
      title: "Giảm",
      dataIndex: "discount",
      key: "discount",
      width: 70,
      render: (discount: number) =>
        discount > 0 ? (
          <span className="text-red-500 font-semibold">-{discount}%</span>
        ) : null,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      width: 80,
      render: (rating: number) => (
        <span className="text-yellow-500">★ {rating?.toFixed(1) || 0}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button size="small" icon={<Edit size={14} />} />
          <Popconfirm
            title="Xóa?"
            onConfirm={() => handleDelete(record.id)}
            okText="Có"
            cancelText="Không"
          >
            <Button danger size="small" icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex gap-3">
        <Input
          placeholder="Tìm kiếm sản phẩm..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-sm text-sm"
          style={{
            backgroundColor: "rgb(31 41 55)",
            border: "none",
            color: "white",
          }}
        />
        <Button type="primary" icon={<Plus size={16} />} size="small">
          Thêm
        </Button>
        <Button icon={<Download size={16} />} size="small" onClick={handleExport}>
          Xuất
        </Button>
        <Upload
          beforeUpload={handleImport}
          accept=".xlsx,.xls"
          showUploadList={false}
        >
          <Button icon={<UploadIcon size={16} />} size="small">
            Nhập
          </Button>
        </Upload>
      </div>

      <div className="flex-1 overflow-auto">
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
            size: "small",
          }}
          scroll={{ x: 1400 }}
          size="small"
        />
      </div>
    </div>
  );
}
