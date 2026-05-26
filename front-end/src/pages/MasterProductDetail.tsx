/** @format */

import { formatPrice } from "@/lib/utils";
import { brandsAPI, masterProductsAPI } from "@/services/api";
import { ShopFilled } from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Flex,
  Progress,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  theme,
  Typography,
} from "antd";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeDollarSign,
  ExternalLink,
  Package,
  ShieldAlert,
  Store,
  TrendingDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const { Title, Text, Paragraph } = Typography;

interface Warning {
  shop_product_id: string;
  shop_product_name: string;
  shop_product_url?: string;
  external_link?: string;
  price_min: number;
  price: number;
  price_max: number;
  rating?: number;
  sold?: number;
  listed_price: number;
  shop_id: string;
  shopInfo?: {
    name: string;
    url?: string;
  };
}

interface Product {
  id: string;
  name: string;
  brand_id: string | null;
  models: string[];
  variants: string[];
  listed_price: number;
  is_active: boolean;
  is_warning?: boolean;
}

export default function MasterProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { token } = theme.useToken();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [warnings, setWarnings] = useState<Warning[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  const fetchData = async () => {
    if (!id) return;

    setLoading(true);

    try {
      const [prodRes, warnRes, brandRes] = await Promise.all([
        masterProductsAPI.get(id),
        masterProductsAPI.getWarning(id),
        brandsAPI.list(1, 1000),
      ]);

      setProduct(prodRes.data);
      setWarnings(warnRes.data.warnings || []);
      setBrands(brandRes.data?.brands || brandRes.data?.items || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const brand = useMemo(() => {
    return brands.find((b) => b.id === product?.brand_id);
  }, [brands, product]);

  if (loading) {
    return (
      <div
        className='min-h-screen p-6'
        style={{ background: token.colorBgLayout }}>
        <Skeleton active avatar paragraph={{ rows: 2 }} className='mb-8' />
        <Row gutter={[16, 16]}>
          <Col xs={24} xl={16}>
            <Card
              bordered={false}
              style={{ borderRadius: token.borderRadiusLG }}>
              <Skeleton active paragraph={{ rows: 6 }} />
            </Card>
          </Col>
          <Col xs={24} xl={8}>
            <Card
              bordered={false}
              style={{ borderRadius: token.borderRadiusLG }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          </Col>
        </Row>
        <div className='mt-8'>
          <Skeleton active title paragraph={{ rows: 2 }} className='mb-4' />
          <Row gutter={[16, 16]}>
            {[1, 2, 3].map((i) => (
              <Col xs={24} md={12} xl={8} key={i}>
                <Card
                  bordered={false}
                  style={{ borderRadius: token.borderRadiusLG }}>
                  <Skeleton active paragraph={{ rows: 4 }} />
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className='h-screen flex items-center justify-center'>
        <Empty description='Không tìm thấy sản phẩm'>
          <Button onClick={() => navigate(-1)}>Quay lại</Button>
        </Empty>
      </div>
    );
  }

  const violationRate = Math.min(100, warnings.length * 10);

  return (
    <div
      className='min-h-screen overflow-x-hidden'
      style={{
        background: token.colorBgLayout,
      }}>
      {/* HEADER */}
      <Flex justify='space-between' align='center' className='mb-6'>
        <Space size='middle'>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(-1)}
            className='border-none shadow-sm hover:!bg-white/10'>
            Quay lại
          </Button>

          <div>
            <Title level={3} style={{ marginBottom: 0, fontWeight: 700 }}>
              {product.name}
            </Title>
          </div>
        </Space>
      </Flex>

      {/* TOP OVERVIEW */}
      <Row>
        <Col xs={24} xl={16}>
          <Card
            bordered={false}
            style={{
              borderRadius: token.borderRadiusLG,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorBgLayout} 100%)`,
            }}>
            <Space direction='vertical' size={20} className='w-full'>
              <div>
                <Flex align='center' gap={12} wrap='wrap'>
                  <Avatar
                    size={60}
                    shape='square'
                    icon={<Package />}
                    style={{
                      background: token.colorPrimaryBg,
                      color: token.colorPrimary,
                    }}
                  />

                  <div className='flex-1'>
                    <Title level={3} style={{ marginBottom: 4 }}>
                      {product.name}
                    </Title>

                    <Space wrap>
                      {brand && <Tag color='processing'>{brand.name}</Tag>}

                      <Tag color={product.is_active ? "success" : "error"}>
                        {product.is_active ?
                          "Đang hoạt động"
                        : "Ngừng hoạt động"}
                      </Tag>

                      {product.is_warning && (
                        <Tag color='error' icon={<ShieldAlert size={12} />}>
                          Đang bị phá giá
                        </Tag>
                      )}
                    </Space>
                  </div>
                </Flex>
              </div>

              <Divider style={{ margin: 0 }} />

              {/* MODELS */}
              <Row gutter={[24, 24]}>
                <Col xs={24} md={12}>
                  <Text strong>Models</Text>

                  <div className='mt-3 flex flex-wrap gap-2'>
                    {product.models?.length ?
                      product.models.map((m) => <Tag key={m}>{m}</Tag>)
                    : <Text type='secondary'>Không có models</Text>}
                  </div>
                </Col>

                <Col xs={24} md={12}>
                  <Text strong>Variants</Text>

                  <div className='mt-3 flex flex-wrap gap-2'>
                    {product.variants?.length ?
                      product.variants.map((v) => (
                        <Tag color='purple' key={v}>
                          {v}
                        </Tag>
                      ))
                    : <Text type='secondary'>Không có variants</Text>}
                  </div>
                </Col>
              </Row>
            </Space>
          </Card>
        </Col>

        {/* RIGHT */}
        <Col xs={24} xl={8}>
          <Space direction='vertical' size={16} className='w-full'>
            <Card
              bordered={false}
              style={{
                borderRadius: token.borderRadiusLG,
                boxShadow: token.boxShadowTertiary,
              }}>
              <div>
                Giá niêm yết :{" "}
                <h1
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: token.colorError,
                  }}>
                  {formatPrice(product.listed_price)}
                </h1>
              </div>

              <Divider />

              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title='Shop vi phạm'
                    value={warnings.length}
                    valueStyle={{
                      color:
                        warnings.length > 0 ?
                          token.colorError
                        : token.colorSuccess,
                    }}
                  />
                </Col>

                <Col span={12}>
                  <Statistic
                    title='Tỉ lệ cảnh báo'
                    value={violationRate}
                    suffix='%'
                    valueStyle={{
                      color:
                        violationRate > 0 ?
                          token.colorWarning
                        : token.colorSuccess,
                    }}
                  />
                </Col>
              </Row>

              <div className='mt-4'>
                <Progress
                  percent={violationRate}
                  status={violationRate > 0 ? "exception" : "success"}
                  strokeColor={token.colorError}
                />
              </div>
            </Card>

            {product.is_warning && (
              <Alert
                type='error'
                showIcon
                icon={<AlertTriangle size={16} />}
                message='Phát hiện sản phẩm đang bị phá giá trên thị trường'
                description='Hệ thống phát hiện nhiều shop đang bán thấp hơn giá niêm yết.'
                style={{
                  borderRadius: token.borderRadiusLG,
                }}
              />
            )}
          </Space>
        </Col>
      </Row>

      {/* WARNING LIST */}
      <div className='mt-8'>
        <Flex
          justify='space-between'
          align='center'
          className='mb-4'
          style={{
            padding: 24,
          }}>
          <div>
            <Title level={4} style={{ marginBottom: 0 }}>
              Danh sách shop vi phạm
            </Title>

            <Text type='secondary'>
              Các cửa hàng đang bán dưới giá niêm yết
            </Text>
          </div>

          <Tag
            color='red'
            style={{
              paddingInline: 14,
              paddingBlock: 6,
              fontSize: 14,
            }}>
            {warnings.length} shop vi phạm
          </Tag>
        </Flex>

        {warnings.length === 0 ?
          <Card
            bordered={false}
            style={{
              borderRadius: token.borderRadiusLG,
            }}>
            <Empty description='Không có shop vi phạm giá' />
          </Card>
        : <Row
            gutter={[16, 16]}
            style={{
              padding: "0 24px",
            }}>
            {warnings.map((w) => {
              const diff = w.listed_price - w.price_min;

              const percent =
                w.listed_price > 0 ? (diff / w.listed_price) * 100 : 0;

              return (
                <Col xs={24} md={12} xl={8} key={w.shop_product_id}>
                  <Card
                    hoverable
                    bordered={false}
                    style={{
                      borderRadius: token.borderRadiusLG,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      border: `1px solid ${token.colorBorderSecondary}`,
                      transition: "all 0.3s ease",
                    }}
                    bodyStyle={{
                      padding: 18,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.borderColor = token.colorError;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.borderColor =
                        token.colorBorderSecondary;
                    }}>
                    <Space direction='vertical' size={18} className='w-full'>
                      {/* SHOP */}
                      <Flex justify='space-between' align='start'>
                        <Space align='start'>
                          <Avatar
                            icon={<Store size={16} />}
                            style={{
                              background: token.colorPrimaryBg,
                              color: token.colorPrimary,
                            }}
                          />

                          <div>
                            <Text strong>
                              {w.shopInfo?.name || "Shop không xác định"}
                            </Text>

                            <div>
                              <Text type='secondary'>ID: {w.shop_id}</Text>
                            </div>
                          </div>
                        </Space>

                        <Tag color='error'>-{percent.toFixed(1)}%</Tag>
                      </Flex>

                      {/* PRODUCT */}
                      <div>
                        <Paragraph
                          ellipsis={{ rows: 2 }}
                          style={{
                            marginBottom: 0,
                            fontWeight: 600,
                            minHeight: 44,
                          }}>
                          {w.shop_product_name}
                        </Paragraph>
                      </div>

                      {/* STATS */}
                      <Row gutter={[12, 12]}>
                        <Col span={12}>
                          <Card
                            size='small'
                            bordered={false}
                            style={{
                              background: token.colorErrorBg,
                            }}>
                            <Text type='secondary'>Giá thấp nhất</Text>

                            <div
                              className='mt-1 font-bold text-lg'
                              style={{
                                color: token.colorError,
                              }}>
                              {formatPrice(w?.price_min)}
                            </div>
                          </Card>
                        </Col>

                        <Col span={12}>
                          <Card
                            size='small'
                            bordered={false}
                            style={{
                              background: token.colorWarningBg,
                            }}>
                            <Text type='secondary'>Chênh lệch</Text>

                            <div
                              className='mt-1 font-bold text-lg'
                              style={{
                                color: token.colorWarning,
                              }}>
                              -{formatPrice(diff)} ({percent.toFixed(1)}%)
                            </div>
                          </Card>
                        </Col>
                      </Row>

                      {/* ACTIONS */}
                      <Flex gap={10}>
                        <Button
                          type='default'
                          icon={<ShopFilled size={14} />}
                          href={"/dashboard/shop-product/" + w.shop_product_id}>
                          Xem chi tiết SP
                        </Button>
                        {w.external_link && (
                          <Button
                            type='primary'
                            icon={<ExternalLink size={14} />}
                            href={w.external_link}
                            target='_blank'
                            block>
                            Xem Trên SHOPPE
                          </Button>
                        )}

                        {w.shopInfo?.url && (
                          <Button
                            icon={<Store size={14} />}
                            href={w.shopInfo.url}
                            target='_blank'
                          />
                        )}
                      </Flex>

                      {/* FOOTER */}
                      <Flex justify='space-between'>
                        <Space size={4}>
                          <BadgeDollarSign size={14} />
                          <Text type='secondary'>Giá niêm yết:</Text>
                        </Space>

                        <Text strong>{formatPrice(w?.listed_price)}</Text>
                      </Flex>

                      <Flex justify='space-between'>
                        <Space size={4}>
                          <TrendingDown size={14} />
                          <Text type='secondary'>Giá hiện tại:</Text>
                        </Space>

                        <Text
                          strong
                          style={{
                            color: token.colorError,
                          }}>
                          {formatPrice(w.price)}
                        </Text>
                      </Flex>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        }
      </div>
    </div>
  );
}
