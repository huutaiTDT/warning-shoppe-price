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
        const res = await productsAPI.list(1, 20, undefined, {
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
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (text: string) => <span className="truncate">{text}</span>,
    },
    {
      title: "Giá hiện tại",
      dataIndex: "priceMin",
      key: "priceMin",
      render: (price: number) => (
        <span className="text-emerald-500 font-semibold">
          {formatPrice(price)}
        </span>
      ),
    },
    {
      title: "Giá niêm yết",
      dataIndex: "priceOriginal",
      key: "priceOriginal",
      render: (price: number) => (
        <span className="text-gray-400 line-through">{formatPrice(price)}</span>
      ),
    },
    {
      title: "Giảm giá",
      dataIndex: "discount",
      key: "discount",
      render: (discount: number) =>
        discount > 0 ? (
          <span className="px-2 py-1 bg-red-500/20 text-red-500 rounded text-xs font-semibold">
            -{discount}%
          </span>
        ) : null,
    },
    {
      title: "Đánh giá",
      dataIndex: "rating",
      key: "rating",
      render: (rating: number) => (
        <span className="text-yellow-500">★ {rating?.toFixed(1) || 0}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Row gutter={16}>
        <Col xs={24} sm={12} lg={8}>
          <Card loading={loadingStats}>
            <Statistic
              title="Tổng cửa hàng"
              value={totalShops}
              prefix={<Store size={20} className="text-emerald-500" />}
            />
            <Link to="/dashboard/shops">
              <Button type="text" size="small" className="w-full mt-3">
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card loading={loadingStats}>
            <Statistic
              title="Tổng sản phẩm"
              value={totalProducts}
              prefix={<Package size={20} className="text-blue-500" />}
            />
            <Link to="/dashboard/products">
              <Button type="text" size="small" className="w-full mt-3">
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card loading={loadingStats}>
            <Statistic
              title="Lịch sử quét"
              value={totalProducts}
              prefix={<BarChart3 size={20} className="text-purple-500" />}
            />
            <Link to="/dashboard/crawl-history">
              <Button type="text" size="small" className="w-full mt-3">
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <div className="flex items-center gap-2">
            <TrendingDown size={18} className="text-yellow-500" />
            <span>Sản phẩm dưới giá niêm yết</span>
          </div>
        }
        loading={loadingProducts}>
        {productsUnderPrice.length === 0 && !loadingProducts ? (
          <Empty description="Không có sản phẩm nào dưới giá niêm yết" />
        ) : (
          <Table
            columns={columns}
            dataSource={productsUnderPrice}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />
        )}

        <div className="mt-4">
          <Link to="/dashboard/products">
            <Button type="primary">
              Xem tất cả sản phẩm <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
