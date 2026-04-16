/** @format */

import ShopSnapshotPopover from "@/components/shop/ShopSnapshotPopover";
import { normalizeProduct } from "@/lib/product";
import { formatPrice, formatPriceRange } from "@/lib/utils";
import { brandsAPI, productsAPI, shopsAPI } from "@/services/api";
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
  ImportIcon,
  LayoutList,
  OutdentIcon,
  Plus,
  RefreshCw,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload as UploadIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

type ViewMode = "table" | "grid";

export default function ProductsPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [shopFilter, setShopFilter] = useState<string | undefined>(undefined);
  const [brandFilter, setBrandFilter] = useState<string | undefined>(undefined);
  const [underOriginal, setUnderOriginal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  const [progress, setProgress] = useState<{
    type: "import" | "export" | null;
    percent: number;
    visible: boolean;
  }>({
    type: null,
    percent: 0,
    visible: false,
  });
  const fakeProgressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopFakeProgress = () => {
    if (fakeProgressRef.current) {
      clearInterval(fakeProgressRef.current);
      fakeProgressRef.current = null;
    }
  };

  const startFakeProgress = () => {
    stopFakeProgress();
    let value = 0;

    fakeProgressRef.current = setInterval(() => {
      value += Math.random() * 12;
      setProgress((prev) => ({
        ...prev,
        percent: Math.min(90, Math.max(prev.percent, Math.round(value))),
      }));

      if (value >= 90) {
        stopFakeProgress();
      }
    }, 250);
  };
  const fetchProducts = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const filters = {
        minPrice: minPrice ?? undefined,
        maxPrice: maxPrice ?? undefined,
        minRating: minRating ?? undefined,
        shop: shopFilter,
        brand: brandFilter,
        underOriginal: underOriginal || undefined,
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

  const fetchBrands = async () => {
    setBrandLoading(true);
    try {
      const res = await brandsAPI.list(1, 1000);
      setBrands(res.data.brands || []);
    } catch (error) {
      message.error("Lỗi tải danh sách thương hiệu");
    } finally {
      setBrandLoading(false);
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
    brandFilter,
    underOriginal,
  ]);

  useEffect(() => {
    fetchShops();
    fetchBrands();
  }, []);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [
    search,
    minPrice,
    maxPrice,
    minRating,
    shopFilter,
    brandFilter,
    underOriginal,
  ]);

  useEffect(() => {
    return () => {
      stopFakeProgress();
    };
  }, []);

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
      setProgress({ type: "export", percent: 0, visible: true });
      startFakeProgress();

      const response = await productsAPI.export({
        onDownloadProgress: (event) => {
          if (event.total) {
            stopFakeProgress();
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress((prev) => ({ ...prev, percent }));
          }
        },
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "products.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();

      setProgress((prev) => ({ ...prev, percent: 100 }));
      message.success("Xuất thành công");
    } catch (error) {
      message.error("Lỗi xuất");
    } finally {
      stopFakeProgress();
      setTimeout(() => {
        setProgress({ type: null, percent: 0, visible: false });
      }, 800);
    }
  };

  const handleImport = async (file: File) => {
    try {
      setProgress({ type: "import", percent: 0, visible: true });
      startFakeProgress();

      await productsAPI.import(file, {
        onUploadProgress: (event) => {
          if (event.total) {
            stopFakeProgress();
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress((prev) => ({ ...prev, percent }));
          }
        },
      });

      setProgress((prev) => ({ ...prev, percent: 100 }));
      message.success("Nhập thành công");

      fetchProducts(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Lỗi nhập");
    } finally {
      stopFakeProgress();
      setTimeout(() => {
        setProgress({ type: null, percent: 0, visible: false });
      }, 800);
    }
    return false;
  };

  const FloatingProgress = () => {
    if (!progress.visible) return null;

    const isDone = progress.percent === 100;
    const isImport = progress.type === "import";

    return (
      <div className='fixed p-4 bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300'>
        <div
          style={{
            padding: "20px",
          }}
          className='bg-gray-900/95 backdrop-blur text-white px-4 py-3 shadow-2xl w-72 border border-gray-700'>
          {/* Header */}
          <div className='flex items-center justify-between mb-2'>
            <div className='flex items-center gap-2 text-sm font-medium'>
              {/* Icon */}
              <div
                className={`w-6 h-6 flex items-center justify-center rounded-full ${
                  isDone ?
                    "bg-green-500/20 text-green-400"
                  : "bg-blue-500/20 text-blue-400 animate-pulse"
                }`}>
                {isDone ?
                  "✓"
                : isImport ?
                  <ImportIcon />
                : <OutdentIcon />}
              </div>

              {/* Text */}
              <span>
                {isDone ?
                  isImport ?
                    "Import hoàn tất"
                  : "Export hoàn tất"
                : isImport ?
                  "Đang import dữ liệu..."
                : "Đang export file..."}
              </span>
            </div>

            {/* % */}
            <span className='text-xs text-gray-300'>{progress.percent}%</span>
          </div>

          {/* Progress bar */}
          <div className='relative w-full bg-gray-700 h-2 rounded overflow-hidden'>
            <div
              className={`
              h-2 rounded transition-all duration-300
              ${isDone ? "bg-green-500" : "bg-gradient-to-r from-blue-500 to-emerald-400"}
            `}
              style={{ width: `${progress.percent}%` }}
            />

            {/* shimmer effect */}
            {!isDone && (
              <div className='absolute inset-0 animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent' />
            )}
          </div>

          {/* Footer */}
          <div className='mt-2 text-[11px] text-gray-400 flex justify-between'>
            <span>{isDone ? "Hoàn tất" : "Vui lòng không tắt tab..."}</span>

            {isDone && (
              <button
                onClick={() =>
                  setProgress({ type: null, percent: 0, visible: false })
                }
                className='text-gray-400 hover:text-white transition'>
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
    );
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
      key: "shop",
      width: 200,
      render: (_: any, record: any) => {
        const shopId = record.shopId || record.shop_id;
        if (!shopId) {
          return <span className='text-gray-500'>Không rõ</span>;
        }
        return (
          <div className='flex flex-col gap-1'>
            <ShopSnapshotPopover
              shopId={shopId}
              shopCode={record.shopCode}
              shopName={record.shopName}
              shopPlatform={record.shopPlatform}>
              <span
                className='font-semibold text-blue-500 cursor-pointer hover:underline'
                onClick={() => navigate(`/dashboard/shops/${shopId}`)}>
                {record.shopCode ? `[${record.shopCode}]` : ""}{" "}
                {record.shopName || "Không rõ"}
              </span>
            </ShopSnapshotPopover>
            {record.shopPlatform && (
              <Tag color='blue'>{record.shopPlatform}</Tag>
            )}
          </div>
        );
      },
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
      <div className='sticky top-0 z-20 flex shrink-0 flex-wrap gap-2 items-center rounded-md border border-gray-800 bg-gray-950/90 px-2 py-2 backdrop-blur'>
        <Button
          type='primary'
          icon={<Plus size={16} />}
          size='large'
          onClick={() => navigate("/dashboard/products/new")}>
          Thêm
        </Button>
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
        <Select
          allowClear
          showSearch
          placeholder='Lọc theo thương hiệu'
          className='min-w-55'
          value={brandFilter}
          loading={brandLoading}
          onChange={(value) => setBrandFilter(value)}
          options={brands.map((brand) => ({
            value: brand.name,
            label: brand.name,
          }))}
        />
        <Space>
          <span className='text-xs text-gray-300'>Nhỏ giá niêm yết</span>
          <Switch checked={underOriginal} onChange={setUnderOriginal} />
        </Space>
        <Button
          icon={<RefreshCw size={14} />}
          onClick={() => {
            setMinPrice(null);
            setMaxPrice(null);
            setMinRating(null);
            setShopFilter(undefined);
            setBrandFilter(undefined);
            setUnderOriginal(false);
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

      {underOriginal && (
        <Alert
          type='warning'
          showIcon
          message='Đang lọc sản phẩm có giá Shopee cao hơn giá niêm yết'
        />
      )}

      <div className='flex-1 overflow-hidden flex flex-col'>
        <div className='flex-1 overflow-auto'>
          {products.length > 0 && (
            <Alert
              type='info'
              showIcon
              className='mb-3'
              message={`Có ${products.filter((p) => p.priceOriginal && p.priceOriginal > 0 && p.priceMin > p.priceOriginal).length} sản phẩm có giá cao hơn giá niêm yết`}
            />
          )}
          {viewMode === "table" ?
            <Table
              columns={columns}
              dataSource={products}
              loading={loading}
              rowKey='id'
              pagination={false}
              scroll={{ x: 1800 }}
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
                        <ShopSnapshotPopover
                          shopId={record.shopId || record.shop_id}
                          shopCode={record.shopCode}
                          shopName={record.shopName}
                          shopPlatform={record.shopPlatform}>
                          <span
                            className='cursor-pointer text-blue-400 hover:underline'
                            onClick={(event) => {
                              event.stopPropagation();
                              if (record.shopId || record.shop_id) {
                                navigate(
                                  `/dashboard/shops/${record.shopId || record.shop_id}`,
                                );
                              }
                            }}>
                            Shop:{" "}
                            {record.shopCode ? `[${record.shopCode}] ` : ""}
                            {record.shopName}
                          </span>
                        </ShopSnapshotPopover>
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
      <FloatingProgress />
    </div>
  );
}
