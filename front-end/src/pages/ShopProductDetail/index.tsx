/** @format */

import { formatPrice } from "@/lib/utils";
import { productsAPI } from "@/services/api";
import { AreaChart } from "@tremor/react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Image,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import { format } from "date-fns";
import {
  ArrowLeft,
  Clock,
  ExternalLink,
  Info,
  ShoppingBag,
  Star,
  Store,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text } = Typography;

export default function ShopProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { token } = theme.useToken();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [prodRes, histRes] = await Promise.all([
        productsAPI.get(id),
        productsAPI.getPriceHistory(id),
      ]);
      setProduct(prodRes.data);
      setHistory(histRes.data.items || []);
    } catch (error) {
      console.error("Error fetching shop product detail:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <Spin size='large' tip='Đang tải thông tin sản phẩm...' />
      </div>
    );
  }

  if (!product) {
    return (
      <div className='h-screen flex items-center justify-center p-6'>
        <Empty description='Không tìm thấy sản phẩm shop'>
          <Button icon={<ArrowLeft size={16} />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        </Empty>
      </div>
    );
  }

  // Prepare chart data
  const chartData = [...history].reverse().map((h) => ({
    date: format(new Date(h.crawledAt), "dd/MM HH:mm"),
    "Giá trung bình": h.shopeeAvgPrice,
    "Giá thấp nhất": h.priceMin,
    "Giá cao nhất": h.priceMax,
    "Giá niêm yết": product.priceOriginal,
  }));
  console.log("Chart Data:", product);

  return (
    <div
      className='min-h-screen p-6'
      style={{ background: token.colorBgLayout }}>
      {/* HEADER */}
      <Flex justify='space-between' align='center' className='mb-6'>
        <Space size='middle'>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
            className='border-none shadow-sm'>
            Quay lại
          </Button>
          <div>
            <Title level={3} style={{ marginBottom: 0 }}>
              Chi tiết sản phẩm Shop
            </Title>
            <Text type='secondary'>
              Thông tin chi tiết từ sàn thương mại điện tử
            </Text>
          </div>
        </Space>

        <Space>
          {product.url && (
            <Button
              type='primary'
              icon={<ExternalLink size={16} />}
              href={product.url}
              target='_blank'
              className='bg-blue-600 border-none'>
              Xem trên sàn
            </Button>
          )}
        </Space>
      </Flex>

      <Row gutter={[20, 20]}>
        {/* LEFT COLUMN: Main Info */}
        <Col xs={24} lg={16}>
          <Space direction='vertical' size={20} className='w-full'>
            {/* Product Overview Card */}
            <Card
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}>
              <Row gutter={[24, 24]}>
                <Col xs={24} md={8}>
                  <Image
                    src={product.image || product.thumbnail}
                    alt={product.name}
                    className='rounded-xl object-cover w-full aspect-square'
                    fallback='https://placehold.co/400x400?text=No+Image'
                  />
                </Col>
                <Col xs={24} md={16}>
                  <Space direction='vertical' size={12} className='w-full'>
                    <div>
                      <Tag color='blue' className='mb-2'>
                        {product.shopPlatform || "SHOPEE"}
                      </Tag>
                      <Title level={4} style={{ marginTop: 0 }}>
                        {product.name}
                      </Title>
                    </div>

                    <div className='flex flex-wrap gap-4'>
                      <Space>
                        <Star
                          className='text-yellow-500'
                          size={16}
                          fill='currentColor'
                        />
                        <Text strong>{product.rating || 0}</Text>
                        <Text type='secondary'>Đánh giá</Text>
                      </Space>
                      <Space>
                        <ShoppingBag className='text-blue-500' size={16} />
                        <Text strong>{product.sold || 0}</Text>
                        <Text type='secondary'>Đã bán</Text>
                      </Space>
                    </div>

                    <Divider style={{ margin: "8px 0" }} />

                    <Descriptions column={2}>
                      <Descriptions.Item label='Thương hiệu'>
                        {product.brand || "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label='Mã sản phẩm'>
                        {product.external_id || "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label='Models' span={2}>
                        {product.models?.length ?
                          product.models.map((m: string) => (
                            <Tag key={m}>{m}</Tag>
                          ))
                        : "-"}
                      </Descriptions.Item>
                      <Descriptions.Item label='Variants' span={2}>
                        {product.variants?.length ?
                          product.variants.map((v: string) => (
                            <Tag key={v} color='purple'>
                              {v}
                            </Tag>
                          ))
                        : "-"}
                      </Descriptions.Item>
                    </Descriptions>
                  </Space>
                </Col>
              </Row>
            </Card>

            {/* Price History Chart */}
            <Card
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}>
              <div className='flex items-center gap-2 mb-6'>
                <Clock className='text-blue-500' size={20} />
                <Title level={4} style={{ margin: 0 }}>
                  Lịch sử biến động giá
                </Title>
              </div>

              {chartData.length > 0 ?
                <div className='h-[350px] mt-4'>
                  <AreaChart
                    className='h-full'
                    data={chartData}
                    index='date'
                    categories={[
                      "Giá trung bình",
                      "Giá thấp nhất",
                      "Giá cao nhất",
                      "Giá niêm yết",
                    ]}
                    colors={[
                      "blue", // Using string names as Tremor primarily supports Tailwind-based names
                      "emerald",
                      "amber",
                      "rose",
                    ]}
                    valueFormatter={(number: number) => formatPrice(number)}
                    yAxisWidth={80}
                    showAnimation={true}
                    curveType='monotone'
                    connectNulls={true}
                    customTooltip={({ payload, active, label }) => {
                      if (!active || !payload) return null;
                      return (
                        <div className='rounded-lg border bg-[#1f2937] p-3 shadow-xl border-gray-700'>
                          <p className='text-sm font-bold text-white mb-2'>
                            {label}
                          </p>
                          <div className='space-y-1'>
                            {payload.map((category: any, index: number) => (
                              <div
                                key={index}
                                className='flex items-center justify-between gap-8'>
                                <div className='flex items-center gap-2'>
                                  <div
                                    className='h-2 w-2 rounded-full'
                                    style={{
                                      background:
                                        category.color === "blue" ? token.blue5
                                        : category.color === "emerald" ?
                                          token.colorSuccess
                                        : category.color === "amber" ?
                                          token.colorWarning
                                        : token.colorError,
                                    }}
                                  />
                                  <span className='text-xs text-gray-400'>
                                    {category.name}
                                  </span>
                                </div>
                                <span className='text-xs font-bold text-white'>
                                  ₫{category.value.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              : <Empty description='Chưa có dữ liệu lịch sử giá' />}
            </Card>

            {/* Price Log Table */}
            <Card
              title='Nhật ký cập nhật'
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}>
              <Table
                dataSource={history}
                rowKey='id'
                columns={[
                  {
                    title: "Thời gian",
                    dataIndex: "crawledAt",
                    render: (date) =>
                      format(new Date(date), "dd/MM/yyyy HH:mm"),
                  },
                  {
                    title: "Giá thấp nhất",
                    dataIndex: "priceMin",
                    render: (v) => <Text strong>{formatPrice(v)}</Text>,
                  },
                  {
                    title: "Giá cao nhất",
                    dataIndex: "priceMax",
                    render: (v) => <Text strong>{formatPrice(v)}</Text>,
                  },
                  {
                    title: "Trung bình",
                    dataIndex: "shopeeAvgPrice",
                    render: (v) => (
                      <Text type='secondary'>{formatPrice(v)}</Text>
                    ),
                  },
                ]}
                pagination={{ pageSize: 5 }}
              />
            </Card>
          </Space>
        </Col>

        {/* RIGHT COLUMN: Sidebar Stats */}
        <Col xs={24} lg={8}>
          <Space direction='vertical' size={20} className='w-full'>
            {/* Price Summary Card */}
            <Card
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
                background:
                  product.isUnderOriginal ?
                    "rgba(239, 68, 68, 0.05)"
                  : "inherit",
              }}>
              <div className='text-gray-400 text-xs uppercase mb-1'>
                Giá hiện tại{" "}
              </div>
              <div className='flex items-baseline gap-2'>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    color:
                      product.isUnderOriginal ?
                        token.colorError
                      : token.colorSuccess,
                  }}>
                  {formatPrice(product.shopeeAvgPrice)}₫
                </Title>
                {product.priceTrend === "down" ?
                  <Tag color='error' icon={<TrendingDown size={12} />}>
                    Giảm
                  </Tag>
                : product.priceTrend === "up" ?
                  <Tag color='warning' icon={<TrendingUp size={12} />}>
                    Tăng
                  </Tag>
                : null}
              </div>

              <Divider style={{ margin: "16px 0" }} />

              <div className='space-y-4'>
                <Flex justify='space-between'>
                  <Text type='secondary'>Giá niêm yết:</Text>
                  <Text strong>{formatPrice(product.priceOriginal)}₫</Text>
                </Flex>
                <Flex justify='space-between'>
                  <Text type='secondary'>Chênh lệch:</Text>
                  <Text
                    strong
                    style={{
                      color:
                        product.priceDelta < 0 ?
                          token.colorError
                        : token.colorSuccess,
                    }}>
                    {product.priceDelta < 0 ? "-" : "+"}₫
                    {Math.abs(product.priceDelta).toLocaleString()}
                  </Text>
                </Flex>
              </div>

              {product.isUnderOriginal && (
                <Alert
                  className='mt-4'
                  type='error'
                  showIcon
                  message='Phá giá'
                  description='Giá đang thấp hơn giá niêm yết'
                />
              )}
            </Card>

            {/* Shop Info Card */}
            <Card
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}>
              <div className='flex items-center gap-2 mb-4'>
                <Store className='text-blue-500' size={20} />
                <Title level={4} style={{ margin: 0 }}>
                  Cửa hàng
                </Title>
              </div>

              <Space direction='vertical' className='w-full'>
                <div>
                  <div className='text-xs text-gray-400'>Tên shop</div>
                  <Text strong className='text-base'>
                    {product.shopName || "N/A"}
                  </Text>
                </div>
                <div>
                  <div className='text-xs text-gray-400'>Mã shop</div>
                  <Tag>{product.shopCode || product.shopId}</Tag>
                </div>

                <Divider style={{ margin: "8px 0" }} />

                <Button
                  block
                  icon={<ExternalLink size={14} />}
                  href={product?.external_link || product.url}
                  target='_blank'>
                  Truy cập cửa hàng
                </Button>
              </Space>
            </Card>

            {/* Raw Data Card (Optional) */}
            <Card
              title={
                <Space>
                  <Info size={16} /> <Text>Dữ liệu thô</Text>
                </Space>
              }
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}>
              <pre className='text-[10px] overflow-auto max-h-[200px] bg-gray-900 p-2 rounded text-emerald-400'>
                {JSON.stringify(product, null, 2)}
              </pre>
            </Card>
          </Space>
        </Col>
      </Row>
    </div>
  );
}
