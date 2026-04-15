/** @format */

import { formatPrice } from "@/lib/utils";
import { productsAPI, shopsAPI } from "@/services/api";
import { Button, Card, Col, Empty, Row, Statistic, Table } from "antd";
import {
  BarChart3,
  ChevronRight,
  Package,
  Store,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function DashboardPage() {
  const [totalShops, setTotalShops] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [productsUnderPrice, setProductsUnderPrice] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [shopsRes, productsRes] = await Promise.all([
          shopsAPI.list(1, 1),
          productsAPI.list(1, 1),
        ]);

        setTotalShops(shopsRes.data.total || 0);
        setTotalProducts(productsRes.data.total || 0);
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchUnderPriceProducts = async () => {
      try {
        const res = await productsAPI.list(1, 10, undefined, {
          underOriginal: true,
        });
        setProductsUnderPrice(res.data.products || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchUnderPriceProducts();
  }, []);

  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className='truncate'>{text}</span>,
    },
    {
      title: "Giá hiện tại",
      dataIndex: "priceMin",
      key: "priceMin",
      render: (price: number) => (
        <span className='text-emerald-500 font-semibold'>
          {formatPrice(price)}
        </span>
      ),
    },
    {
      title: "Giá gốc",
      dataIndex: "priceOriginal",
      key: "priceOriginal",
      render: (price: number) => (
        <span className='text-gray-400 line-through text-sm'>
          {formatPrice(price)}
        </span>
      ),
    },
    {
      title: "Giảm",
      dataIndex: "discount",
      key: "discount",
      render: (discount: number) =>
        discount > 0 ?
          <span className='text-red-500 font-semibold'>-{discount}%</span>
        : null,
    },
    {
      title: "Rating",
      dataIndex: "rating",
      key: "rating",
      render: (rating: number) => (
        <span className='text-yellow-500'>★ {rating?.toFixed(1) || 0}</span>
      ),
    },
  ];

  return (
    <div className='space-y-6'>
      <Row>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loadingStats} size='small'>
            <Statistic
              title='Tổng cửa hàng'
              value={totalShops}
              prefix={<Store size={18} className='text-emerald-500' />}
            />
            <Link to='/dashboard/shops'>
              <Button type='text' size='small' className='w-full mt-3'>
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card loading={loadingStats} size='small'>
            <Statistic
              title='Tổng sản phẩm'
              value={totalProducts}
              prefix={<Package size={18} className='text-blue-500' />}
            />
            <Link to='/dashboard/products'>
              <Button type='text' size='small' className='w-full mt-3'>
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card loading={loadingStats} size='small'>
            <Statistic
              title='Lịch sử quét'
              value={totalProducts}
              prefix={<BarChart3 size={18} className='text-purple-500' />}
            />
            <Link to='/dashboard/crawl-history'>
              <Button type='text' size='small' className='w-full mt-3'>
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div className='flex items-center gap-2'>
            <TrendingDown size={16} className='text-yellow-500' />
            <span className='text-sm'>Sản phẩm dưới giá</span>
          </div>
        }
        loading={loadingProducts}>
        {productsUnderPrice.length === 0 && !loadingProducts ?
          <Empty description='Không có dữ liệu' />
        : <Table
            columns={columns}
            dataSource={productsUnderPrice}
            rowKey='id'
            pagination={false}
            scroll={{ x: 600 }}
            size='small'
          />
        }

        <div className='mt-4'>
          <Link to='/dashboard/products'>
            <Button type='primary'>
              Xem tất cả <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
