/** @format */

import Pagination from "@/components/pagination";
import { shopsAPI } from "@/services/api";
import { Button, Spin, Table, message } from "antd";
import { ArrowLeft, Edit } from "lucide-react";
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

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);

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

  const fetchShopProducts = async (page = 1, limit = 10) => {
    if (!id) return;
    try {
      setProductsLoading(true);
      const res = await shopsAPI.getProducts(id, page, limit);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
      setPagination({ page, pageSize: limit });
    } catch (error) {
      message.error("Lỗi tải sản phẩm");
    } finally {
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    fetchShopDetail();
    fetchShopProducts(pagination.page, pagination.pageSize);
  }, [id]);

  const handlePageChange = (newPage: number) => {
    fetchShopProducts(newPage, pagination.pageSize);
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 80,
      render: (image: string) => (
        <img src={image} alt='Product' className='w-16 h-16 object-cover' />
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
        <h2 className='text-lg font-semibold mb-4'>Sản phẩm ({total})</h2>
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
    </div>
  );
}
