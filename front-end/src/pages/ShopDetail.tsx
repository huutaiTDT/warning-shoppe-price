/** @format */

import Pagination from "@/components/pagination";
import { brandsAPI, productsAPI, shopsAPI } from "@/services/api";
import { Button, Input, message, Modal, Select, Spin, Table, Tag } from "antd";
import { ArrowLeft, Calendar, Edit, History, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface Shop {
  id: string;
  name: string;
  url: string;
  platform: string;
  code?: string;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  price_min: number;
  price_max: number;
  original_price: number;
  brand?: string;
  created_at?: string;
}

interface PriceHistory {
  id?: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  crawledAt?: any;
}

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [searchName, setSearchName] = useState("");
  const [searchBrand, setSearchBrand] = useState<string | undefined>();
  const [brandOptions, setBrandOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // Price History state
  const [priceHistoryModal, setPriceHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

  const fetchShopDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await shopsAPI.get(id);
      setShop(res.data);
    } catch (error) {
      message.error("Lỗi tải thông tin cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    if (!id) return;
    try {
      setFilterLoading(true);
      const res = await brandsAPI.selectBox();
      setBrandOptions(res.data || []);
    } catch (error) {
      console.error("Lỗi tải tùy chọn lọc:", error);
    } finally {
      setFilterLoading(false);
    }
  };

  const fetchShopProducts = async (
    page = 1,
    limit = 10,
    name = "",
    brand = "",
  ) => {
    if (!id) return;
    try {
      setProductsLoading(true);
      const res = await shopsAPI.getProducts(id, page, limit, name, brand);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
      setPagination({ page, pageSize: limit });
    } catch (error) {
      message.error("Lỗi tải sản phẩm");
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchPriceHistory = async (productId: string) => {
    setPriceHistoryLoading(true);
    try {
      const res = await productsAPI.getPriceHistory(productId, 100);
      setPriceHistory(res.data.items || res.data || []);
    } catch (error) {
      message.error("Lỗi tải lịch sử giá");
      setPriceHistory([]);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  const handleViewPriceHistory = async (product: Product) => {
    setSelectedProduct(product);
    setPriceHistoryModal(true);
    await fetchPriceHistory(product.id);
  };

  useEffect(() => {
    fetchShopDetail();
    fetchFilterOptions();
    fetchShopProducts(pagination.page, pagination.pageSize);
  }, [id]);

  const handlePageChange = (newPage: number) => {
    fetchShopProducts(newPage, pagination.pageSize, searchName, searchBrand);
  };

  const handleSearch = () => {
    fetchShopProducts(1, pagination.pageSize, searchName, searchBrand || "");
  };

  const handleClearSearch = () => {
    setSearchName("");
    setSearchBrand(undefined);
    fetchShopProducts(1, pagination.pageSize, "", "");
  };

  const handleBrandChange = (value: string | undefined) => {
    setSearchBrand(value);
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 80,
      render: (image: string) => (
        <img
          src={image}
          alt='Product'
          className='w-16 h-16 object-cover rounded'
        />
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: 250,
      ellipsis: true,
    },
    {
      title: "Brand",
      dataIndex: "brand",
      key: "brand",
      width: 120,
      render: (brand: string) => brand || "-",
    },
    {
      title: "Giá Min",
      dataIndex: "price_min",
      key: "price_min",
      width: 120,
      align: "right" as const,
      render: (price: number) => price?.toLocaleString("vi-VN") || "-",
    },
    {
      title: "Giá Max",
      dataIndex: "price_max",
      key: "price_max",
      width: 120,
      align: "right" as const,
      render: (price: number) => price?.toLocaleString("vi-VN") || "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: any, product: Product) => (
        <Button
          type='text'
          icon={<History size={14} />}
          onClick={() => handleViewPriceHistory(product)}
          className='text-blue-400 hover:text-blue-300'
          title='Xem lịch sử giá'>
          Lịch sử giá
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Spin size='large' />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <p className='text-gray-400 mb-4'>Không tìm thấy cửa hàng</p>
        <Button onClick={() => navigate("/dashboard/shops")}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 10,
      }}
      className='space-y-6 gap-4 flex flex-col h-full pb-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          type='text'
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate("/dashboard/shops")}
          className='text-gray-400! hover:text-white!'
        />
        <h1 className='text-2xl font-bold'>{shop.name}</h1>
      </div>

      {/* Section 1: Shop Info */}
      <div
        style={{
          padding: 10,
        }}
        className='bg-gray-800 rounded-lg p-6 border border-gray-700'>
        <div className='flex justify-between items-start mb-6'>
          <h2 className='text-lg font-semibold'>Thông tin cửa hàng</h2>
          <Button
            type='primary'
            icon={<Edit size={14} />}
            onClick={() => navigate(`/dashboard/shops/${id}/edit`)}>
            Chỉnh sửa
          </Button>
        </div>

        <div
          className='grid grid-cols-1 md:grid-cols-2 gap-6'
          style={{
            padding: 10,
          }}>
          {/* Name */}
          <div>
            <p className='text-sm text-gray-400 mb-1'>Tên cửa hàng</p>
            <p className='text-white font-medium'>{shop.name}</p>
          </div>

          {/* Platform */}
          <div>
            <p className='text-sm text-gray-400 mb-1'>Nền tảng</p>
            <p className='text-white font-medium'>{shop.platform}</p>
          </div>

          {/* Code */}
          <div>
            <p className='text-sm text-gray-400 mb-1'>Mã cửa hàng</p>
            <p className='text-white font-medium'>{shop.code || "-"}</p>
          </div>

          {/* Created Date */}
          <div>
            <p className='text-sm text-gray-400 mb-1'>Tạo lúc</p>
            <p className='text-white font-medium'>
              {shop.created_at ?
                new Date(shop.created_at).toLocaleDateString("vi-VN")
              : "-"}
            </p>
          </div>

          {/* URL */}
          <div className='md:col-span-2'>
            <p className='text-sm text-gray-400 mb-1'>URL cửa hàng</p>
            <a
              href={shop.url}
              target='_blank'
              rel='noopener noreferrer'
              className='text-emerald-500 hover:text-emerald-400 break-all'>
              {shop.url}
            </a>
          </div>
        </div>
      </div>

      {/* Section 2: Products */}
      <div
        style={{
          padding: 10,
        }}
        className='flex-1 flex flex-col bg-gray-800 rounded-lg p-6 border border-gray-700 min-h-0'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>Sản phẩm ({total})</h2>
        </div>

        {/* Search Filters */}
        <div
          className='mb-4 flex gap-2 flex-wrap bg-black'
          style={{
            padding: 10,
          }}>
          <Input
            placeholder='Nhập tên sản phẩm...'
            value={searchName || ""}
            onChange={(e) => setSearchName(e.target.value)}
            onPressEnter={handleSearch}
            style={{ minWidth: 200, flex: 1 }}
          />
          <Select
            placeholder='Chọn thương hiệu...'
            value={searchBrand}
            onChange={handleBrandChange}
            allowClear
            loading={filterLoading}
            style={{ minWidth: 200, flex: 1 }}
            options={brandOptions}
          />
          <Button type='primary' onClick={handleSearch}>
            Lọc
          </Button>
          {(searchName || searchBrand) && (
            <Button
              type='text'
              icon={<X size={14} />}
              onClick={handleClearSearch}
              className='text-gray-400 hover:text-white!'>
              Xóa bộ lọc
            </Button>
          )}
        </div>
        {/* header */}
        {columns.length > 0 && (
          <div
            className='flex justify-between  items-center bg-gray-700 px-4 py-2 border-b border-gray-600'
            style={{
              minWidth: 1000,
              padding: 10,
            }}>
            {columns.map((col) => (
              <div
                key={col.key}
                style={{
                  width: col?.width,
                }}
                className={`font-medium justify-end items-center flex text-sm text-gray-400 uppercase tracking-wider ${col.width ? `w-[${col.width}px]` : "flex-1"}`}>
                {col.title}
              </div>
            ))}
          </div>
        )}
        <div className='flex-1 overflow-hidden flex flex-col'>
          <div className='flex-1 overflow-auto'>
            <Table
              showHeader={false}
              columns={columns}
              dataSource={products}
              loading={productsLoading}
              rowKey='id'
              pagination={false}
              scroll={{ x: 1000, y: "100%" }}
              size='middle'
            />
          </div>

          <div className='mt-4'>
            <Pagination
              currentCount={pagination.page}
              pageSize={pagination.pageSize}
              total={total}
              onChange={handlePageChange}
              page={
                pagination.page > Math.ceil(total / pagination.pageSize) ?
                  1
                : pagination.page
              }
            />
          </div>
        </div>
      </div>

      {/* Price History Modal */}
      <Modal
        open={priceHistoryModal}
        onCancel={() => {
          setPriceHistoryModal(false);
          setSelectedProduct(null);
          setPriceHistory([]);
        }}
        footer={null}
        width={700}
        title={
          <div className='flex items-center gap-2'>
            <History size={18} />
            <span>Lịch sử giá - {selectedProduct?.name}</span>
          </div>
        }>
        {priceHistoryLoading ?
          <div className='flex justify-center py-8'>
            <Spin />
          </div>
        : priceHistory.length > 0 ?
          <div className='space-y-3'>
            {/* Timeline */}
            <div
              style={{
                padding: 10,
              }}
              className='bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 max-h-96 overflow-y-auto'>
              <div className='space-y-2'>
                {priceHistory.map((record, index) => {
                  return (
                    <div
                      style={{
                        padding: 10,
                      }}
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isLatest ?
                          "bg-blue-500/10 border-blue-500/20"
                        : "bg-gray-700/20 border-gray-700/30 hover:bg-gray-700/40"
                      }`}>
                      {/* Timeline marker */}
                      <div className='mt-1'>
                        {isLatest ?
                          <div className='w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-400/30' />
                        : <div className='w-2 h-2 rounded-full bg-gray-500' />}
                      </div>

                      {/* Content */}
                      <div className='flex-1'>
                        <div className='flex items-center justify-between mb-1'>
                          {isLatest && (
                            <Tag color='blue' className='text-xs'>
                              Mới nhất
                            </Tag>
                          )}
                        </div>
                        <div className='flex items-center gap-1 text-xs text-gray-400'>
                          <Calendar size={12} />
                          {new Date(record.crawledAt).toLocaleString?.("vi-VN")}
                        </div>
                        {record.priceMin && record.priceMax && (
                          <div className='text-xs text-gray-500 mt-1'>
                            Range: ₫{record.priceMin?.toLocaleString?.()} - ₫
                            {record.priceMax?.toLocaleString?.()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                padding: 10,
              }}
              className='bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center text-sm'>
              <div className='text-gray-300'>
                Theo dõi từ{" "}
                <span className='font-semibold text-amber-400'>
                  {priceHistory.length}
                </span>{" "}
                lần ghi nhận
              </div>
            </div>
          </div>
        : <div className='text-center py-8 text-gray-400'>
            Không có lịch sử giá
          </div>
        }
      </Modal>
    </div>
  );
}
