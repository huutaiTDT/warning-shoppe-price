/** @format */

import { normalizeProduct } from "@/lib/product";
import { formatPrice, formatPriceRange } from "@/lib/utils";
import { productsAPI, shopsAPI } from "@/services/api";
import {
  Alert,
  Button,
  Card,
  Col,
  Image,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import {
  AlertTriangle,
  Download,
  Edit,
  Grid3X3,
  LayoutList,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload as UploadIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type ViewMode = "table" | "grid";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [shopFilter, setShopFilter] = useState<string | undefined>(undefined);
  const [aboveOriginal, setAboveOriginal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));

  const fetchProducts = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const filters = {
        minPrice: minPrice ?? undefined,
        maxPrice: maxPrice ?? undefined,
        minRating: minRating ?? undefined,
        shop: shopFilter,
        aboveOriginal: aboveOriginal || undefined,
      };

      const res = await productsAPI.list(
        page,
        limit,
        search || undefined,
        filters,
      );
      setProducts((res.data.products || []).map(normalizeProduct));
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const fetchShops = async () => {
    try {
      const res = await shopsAPI.list(1, 1000);
      setShops(res.data.shops || []);
    } catch (error) {
      message.error("Lỗi tải danh sách shop");
    }
  };

  useEffect(() => {
    fetchProducts(pagination.page, pagination.pageSize);
  }, [
    search,
    pagination,
    minPrice,
    maxPrice,
    minRating,
    shopFilter,
    aboveOriginal,
  ]);

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [search, minPrice, maxPrice, minRating, shopFilter, aboveOriginal]);

  const getTrendNode = (record: any) => {
    if (!record.priceOriginal || record.priceOriginal <= 0) {
      return <Tag>Chưa có giá niêm yết</Tag>;
    }

    if (record.priceTrend === "down") {
      return (
        <Space direction='vertical' size={4}>
          <Tag icon={<TrendingDown size={12} />} color='green'>
            Đang giảm
          </Tag>
          <Button size='small' danger icon={<AlertTriangle size={12} />}>
            Cảnh báo giá thấp
          </Button>
        </Space>
      );
    }

    if (record.priceTrend === "up") {
      return (
        <Space direction='vertical' size={4}>
          <Tag icon={<TrendingUp size={12} />} color='red'>
            Cao hơn niêm yết
          </Tag>
          <Button size='small' danger icon={<AlertTriangle size={12} />}>
            Cảnh báo giá cao
          </Button>
        </Space>
      );
    }

    return <Tag color='default'>Ổn định</Tag>;
  };

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
      title: "Thumbnail",
      dataIndex: "thumbnail",
      key: "thumbnail",
      width: 100,
      render: (thumbnail: string, record: any) =>
        thumbnail ?
          <Image
            src={thumbnail}
            alt={record.name}
            width={56}
            height={56}
            className='rounded-md object-cover'
            fallback='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
          />
        : <div className='w-14 h-14 rounded-md bg-gray-700 flex items-center justify-center text-xs text-gray-300'>
            No Img
          </div>,
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: 100,
      render: (text: string) => <div className='truncate'>{text}</div>,
    },
    {
      title: "Thương hiệu",
      dataIndex: "brand",
      key: "brand",
      width: 140,
      render: (brand: string) => <Tag>{brand || "Không rõ"}</Tag>,
    },
    {
      title: "Shop",
      dataIndex: "shopName",
      key: "shopName",
      width: 160,
      render: (shopName: string) => <span>{shopName || "Không rõ"}</span>,
    },
    {
      title: "Giá Shopee",
      dataIndex: "priceMin",
      key: "priceMin",
      width: 180,
      render: (_: number, record: any) => (
        <span className='text-emerald-500 font-semibold'>
          {formatPriceRange(record.priceMin, record.priceMax)}
        </span>
      ),
    },
    {
      title: "Giá niêm yết",
      dataIndex: "priceOriginal",
      key: "priceOriginal",
      width: 120,
      render: (price: number) =>
        price > 0 ?
          <span className='text-gray-400 line-through text-sm'>
            {formatPrice(price)}
          </span>
        : <span className='text-gray-500 text-xs'>Chưa có</span>,
    },
    {
      title: "Chênh lệch",
      dataIndex: "priceDelta",
      key: "priceDelta",
      width: 140,
      render: (delta: number, record: any) => {
        if (!record.priceOriginal || record.priceOriginal <= 0) {
          return <span className='text-xs text-gray-500'>N/A</span>;
        }

        const abs = Math.abs(delta);
        const text = formatPrice(abs);
        return (
          delta < 0 ?
            <span className='text-emerald-500 font-semibold'>-{text}</span>
          : delta > 0 ?
            <span className='text-red-500 font-semibold'>+{text}</span>
          : <span className='text-gray-300'>0</span>
        );
      },
    },
    {
      title: "Xu hướng",
      key: "trend",
      width: 170,
      render: (_: any, record: any) => getTrendNode(record),
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      width: 80,
      render: (rating: number) => (
        <span className='text-yellow-500'>★ {rating?.toFixed(1) || 0}</span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size='large'>
          <Button
            size='large'
            icon={<Edit size={14} />}
            onClick={(event) => {
              event.stopPropagation();
              navigate(`/dashboard/products/${record.id}/edit`);
            }}
          />
          <Popconfirm
            title='Xóa?'
            onConfirm={() => handleDelete(record.id)}
            okText='Có'
            cancelText='Không'>
            <Button
              danger
              size='large'
              icon={<Trash2 size={14} />}
              onClick={(event) => {
                event.stopPropagation();
              }}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className='space-y-4 h-full flex flex-col'>
      <div className='flex shrink-0 flex-wrap gap-2 items-center'>
        <Input
          placeholder='Tìm kiếm sản phẩm...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='flex-1 max-w-sm text-sm'
          style={{
            backgroundColor: "rgb(31 41 55)",
            border: "none",
            color: "white",
          }}
        />
        <InputNumber
          placeholder='Giá min'
          min={0}
          value={minPrice as number | null}
          onChange={(value) =>
            setMinPrice(typeof value === "number" ? value : null)
          }
        />
        <InputNumber
          placeholder='Giá max'
          min={0}
          value={maxPrice as number | null}
          onChange={(value) =>
            setMaxPrice(typeof value === "number" ? value : null)
          }
        />
        <InputNumber
          placeholder='Rating min'
          min={0}
          max={5}
          step={0.1}
          value={minRating as number | null}
          onChange={(value) =>
            setMinRating(typeof value === "number" ? value : null)
          }
        />
        <Select
          allowClear
          placeholder='Lọc theo shop'
          className='min-w-55'
          value={shopFilter}
          onChange={(value) => setShopFilter(value)}
          options={shops.map((shop) => ({ value: shop.id, label: shop.name }))}
        />
        <Space>
          <span className='text-xs text-gray-300'>Trên giá niêm yết</span>
          <Switch checked={aboveOriginal} onChange={setAboveOriginal} />
        </Space>
        <Button
          icon={<RefreshCw size={14} />}
          onClick={() => {
            setMinPrice(null);
            setMaxPrice(null);
            setMinRating(null);
            setShopFilter(undefined);
            setAboveOriginal(false);
            setSearch("");
          }}>
          Clear
        </Button>
        <Space>
          <Button
            type={viewMode === "table" ? "primary" : "default"}
            icon={<LayoutList size={14} />}
            onClick={() => setViewMode("table")}>
            Cột
          </Button>
          <Button
            type={viewMode === "grid" ? "primary" : "default"}
            icon={<Grid3X3 size={14} />}
            onClick={() => setViewMode("grid")}>
            Grid
          </Button>
        </Space>
        <Button
          type='primary'
          icon={<Plus size={16} />}
          size='large'
          onClick={() => navigate("/dashboard/products/new")}>
          Thêm
        </Button>
        <Button
          icon={<Download size={16} />}
          size='large'
          onClick={handleExport}>
          Xuất
        </Button>
        <Upload
          beforeUpload={handleImport}
          accept='.xlsx,.xls'
          showUploadList={false}>
          <Button icon={<UploadIcon size={16} />} size='large'>
            Nhập
          </Button>
        </Upload>
      </div>

      {aboveOriginal && (
        <Alert
          type='warning'
          showIcon
          message='Đang lọc sản phẩm có giá Shopee cao hơn giá niêm yết'
        />
      )}

      <div className='flex-1 overflow-hidden flex flex-col'>
        <div className='flex-1 overflow-auto'>
          {viewMode === "table" ?
            <Table
              columns={columns}
              dataSource={products}
              loading={loading}
              rowKey='id'
              pagination={false}
              scroll={{ x: 1800, y: "100%" }}
              size='large'
              onRow={(record) => ({
                onClick: () => navigate(`/dashboard/products/${record.id}`),
                className: "cursor-pointer",
              })}
            />
          : <Row gutter={[0, 0]}>
              {products.map((record) => (
                <Col xs={24} md={12} xl={8} xxl={4} key={record.id}>
                  <Card
                    title={record.name}
                    extra={record.brand ? <Tag>{record.brand}</Tag> : null}
                    className='h-full cursor-pointer'
                    onClick={() =>
                      navigate(`/dashboard/products/${record.id}`)
                    }>
                    <Space direction='vertical' size={10} className='w-full'>
                      {record.thumbnail ?
                        <Image
                          src={record.thumbnail}
                          alt={record.name}
                          className='rounded-md object-cover'
                          height={180}
                          width='100%'
                          fallback='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
                        />
                      : <div className='w-full h-45 rounded-md bg-gray-700 flex items-center justify-center text-sm text-gray-300'>
                          Không có ảnh
                        </div>
                      }

                      <div className='text-xs text-gray-300'>
                        Shop: {record.shopName}
                      </div>
                      <div className='text-emerald-500 font-semibold'>
                        {formatPriceRange(record.priceMin, record.priceMax)}
                      </div>
                      <div className='text-xs text-gray-400'>
                        Giá niêm yết:{" "}
                        {record.priceOriginal > 0 ?
                          formatPrice(record.priceOriginal)
                        : "Chưa có"}
                      </div>
                      {record.isOverOriginal && (
                        <Alert
                          type='error'
                          showIcon
                          icon={<AlertTriangle size={14} />}
                          message='Giá hiện tại đang cao hơn giá niêm yết'
                        />
                      )}
                      {getTrendNode(record)}
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          }
        </div>

        <div className='shrink-0 bg-gray-900 border-t border-gray-800 px-4 py-3'>
          <div className='flex items-center justify-between'>
            <span className='text-xs text-gray-400'>
              Hiển thị {products.length} / {total} mục
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
                Trang {pagination.page}/{totalPages}
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
