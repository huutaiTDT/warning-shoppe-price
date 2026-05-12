/** @format */

import { reportsAPI, shopsAPI } from "@/services/api";
import {
  AlertOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Badge,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from "antd";

import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

const valueFormatter = (number: number) =>
  `${new Intl.NumberFormat("vi-VN").format(number || 0)} ₫`;

export default function ReportsPage() {
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(false);

  const [fluctuations, setFluctuations] = useState<any[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    dates: [],
    shopId: null,
  });

  const fetchShops = async () => {
    try {
      const res = await shopsAPI.selectBox();
      console.log(res.data.shops)
      setShops(res.data.shops || []);
    } catch (error) {
      message.error("Lỗi tải danh sách cửa hàng");
    }
  };

  const fetchFluctuations = async () => {
    try {
      setLoading(true);

      const params: any = {};

      if (filters.dates && filters.dates.length === 2) {
        params.startDate = filters.dates[0];
        params.endDate = filters.dates[1];
      }

      if (filters.shopId) {
        params.shopId = filters.shopId;
      }

      const res = await reportsAPI.getPriceFluctuations(params);

      const formattedData = (res.data.items || []).map((item: any) => ({
        ...item,
        date: dayjs(item.created_at).format("DD/MM/YYYY HH:mm"),
      }));

      setFluctuations(formattedData);
    } catch (error) {
      message.error("Lỗi tải dữ liệu biến động giá");
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const params: any = {};
      
      if (filters.dates && filters.dates.length === 2) {
        const start = dayjs(filters.dates[0]);
        params.year = start.year();
        params.month = start.month() + 1;
      }
      
      if (filters.shopId) {
        params.shopId = filters.shopId;
      }
      
      const res = await reportsAPI.getMonthlySummary(params);

      const formattedData = (res.data.summary || []).map((item: any) => ({
        name: `${item.product_name} - ${item.shop_name}`,
        minPrice: Number(item.min_price || 0),
        maxPrice: Number(item.max_price || 0),
        avgPrice: Number(item.avg_price || 0),
      }));

      setMonthlySummary(formattedData);
    } catch (error) {
      message.error("Lỗi tải báo cáo tháng");
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    fetchFluctuations();
    fetchMonthlySummary();
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const stats = useMemo(() => {
    const increased = fluctuations.filter((i) => i.change > 0).length;
    const decreased = fluctuations.filter((i) => i.change < 0).length;

    const totalChanges = fluctuations.length;

    const totalImpact = fluctuations.reduce(
      (sum, item) => sum + Number(item.change || 0),
      0,
    );

    return {
      increased,
      decreased,
      totalChanges,
      totalImpact,
    };
  }, [fluctuations]);

  const columns: any[] = [
    {
      title: "Sản phẩm",
      dataIndex: "product_name",
      key: "product_name",
      width: 300,
      render: (value: string) => (
        <Flex vertical>
          <Text strong>{value}</Text>
        </Flex>
      ),
    },

    {
      title: "Cửa hàng",
      dataIndex: "shop_name",
      key: "shop_name",
      width: 220,
      render: (value: string) => (
        <Tag color='processing' style={{ padding: '4px 12px', borderRadius: token.borderRadiusLG, border: 0 }}>
          {value}
        </Tag>
      ),
    },

    {
      title: "Giá trước",
      dataIndex: "previous_price",
      key: "previous_price",
      align: "right",
      render: (value: number) => <Text>{valueFormatter(value)}</Text>,
    },

    {
      title: "Giá hiện tại",
      dataIndex: "price",
      key: "price",
      align: "right",
      render: (value: number) => <Text strong>{valueFormatter(value)}</Text>,
    },

    {
      title: "Biến động",
      dataIndex: "change",
      key: "change",
      align: "right",

      render: (value: number) => {
        const isIncrease = value > 0;

        return (
          <Tag
            color={isIncrease ? "success" : "error"}
            style={{
              padding: '4px 12px',
              borderRadius: token.borderRadiusLG,
              fontSize: token.fontSizeSM,
              fontWeight: 600,
              border: 0,
            }}>
            <Space>
              {isIncrease ?
                <ArrowUpOutlined />
              : <ArrowDownOutlined />}

              {valueFormatter(Math.abs(value))}
            </Space>
          </Tag>
        );
      },
    },

    {
      title: "Thời gian",
      dataIndex: "date",
      key: "date",
      width: 180,
    },
  ];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: token.colorBgLayout, padding: token.paddingLG }}>
      <div style={{ maxWidth: 1600, margin: "0 auto", display: 'flex', flexDirection: 'column', gap: token.marginLG }}>
        {/* HEADER */}

        <Flex justify='space-between' align='center'>
          <div>
            <Title level={2} style={{ marginBottom: token.marginXXS }}>
              📊 Price Analytics Dashboard
            </Title>

            <Text type='secondary'>
              Theo dõi biến động giá sản phẩm theo thời gian
            </Text>
          </div>

          <Space size='middle'>
            <RangePicker
              size='large'
              onChange={( dateStrings) =>
                handleFilterChange("dates", dateStrings)
              }
            />

            <Select
              allowClear
              size='large'
              placeholder='Chọn cửa hàng'
              style={{ width: 260 }}
              onChange={(value) => handleFilterChange("shopId", value)}
              options={(shops || []).map((shop: any) => ({
                value: shop.id,
                label: shop.name,
              }))}
            />
          </Space>
        </Flex>

        {/* STATS */}

        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={6}>
            <Card style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, border: 0 }}>
              <Statistic
                title='Tổng biến động'
                value={stats.totalChanges}
                prefix={<AlertOutlined style={{ color: token.colorWarning }} />}
              />
            </Card>
          </Col>

          <Col xs={24} md={12} lg={6}>
            <Card style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, border: 0 }}>
              <Statistic
                title='Tăng giá'
                value={stats.increased}
                valueStyle={{ color: token.colorSuccess }}
                prefix={<ArrowUpOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} md={12} lg={6}>
            <Card style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, border: 0 }}>
              <Statistic
                title='Giảm giá'
                value={stats.decreased}
                valueStyle={{ color: token.colorError }}
                prefix={<ArrowDownOutlined />}
              />
            </Card>
          </Col>

          <Col xs={24} md={12} lg={6}>
            <Card style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, border: 0 }}>
              <Statistic
                title='Tổng thay đổi'
                value={valueFormatter(stats.totalImpact)}
                prefix={<RiseOutlined style={{ color: token.colorPrimary }} />}
              />
            </Card>
          </Col>
        </Row>

        {/* CHART */}

        <Card
          style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, border: 0 }}
          styles={{
            body: {
              padding: token.paddingLG,
            },
          }}>
          <Flex justify='space-between' align='center' style={{ marginBottom: token.marginLG }}>
            <div>
              <Title level={4} style={{ marginBottom: token.marginXXS }}>
                Xu hướng giá sản phẩm
              </Title>

              <Text type='secondary'>
                Giá thấp nhất / cao nhất / trung bình
              </Text>
            </div>

            <Badge color={token.colorPrimary} text='Monthly Analytics' />
          </Flex>

          <div style={{ height: 420 }}>
            <ResponsiveContainer width='100%' height='100%'>
              <AreaChart data={monthlySummary}>
                <defs>
                  <linearGradient id='colorAvg' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor={token.colorPrimary} stopOpacity={0.4} />
                    <stop offset='95%' stopColor={token.colorPrimary} stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray='3 3' stroke={token.colorBorderSecondary} vertical={false} />

                <XAxis dataKey='name' tick={{ fontSize: 12, fill: token.colorTextSecondary }} axisLine={false} tickLine={false} />

                <YAxis
                  tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                  tick={{ fill: token.colorTextSecondary }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  formatter={(value: any) => valueFormatter(Number(value))}
                  contentStyle={{ borderRadius: token.borderRadius, border: `1px solid ${token.colorBorderSecondary}`, boxShadow: token.boxShadowSecondary }}
                />

                <Area
                  type='monotone'
                  dataKey='avgPrice'
                  stroke={token.colorPrimary}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill='url(#colorAvg)'
                  name='Giá trung bình'
                />

                <Area
                  type='monotone'
                  dataKey='maxPrice'
                  stroke={token.colorSuccess}
                  strokeWidth={2}
                  fillOpacity={0}
                  name='Giá cao nhất'
                />

                <Area
                  type='monotone'
                  dataKey='minPrice'
                  stroke={token.colorError}
                  strokeWidth={2}
                  fillOpacity={0}
                  name='Giá thấp nhất'
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* TABLE */}

        <Card
          style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary, border: 0 }}
          styles={{
            body: {
              padding: 0,
            },
          }}>
          <div style={{ padding: token.paddingLG, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
            <Flex justify='space-between' align='center'>
              <div>
                <Title level={4} style={{ marginBottom: token.marginXXS }}>
                  Lịch sử biến động giá
                </Title>

                <Text type='secondary'>
                  Theo dõi từng lần thay đổi giá sản phẩm
                </Text>
              </div>

              <Tag
                color='processing'
                style={{ padding: '4px 16px', borderRadius: token.borderRadiusLG, fontSize: token.fontSizeSM, border: 0 }}>
                {fluctuations.length} biến động
              </Tag>
            </Flex>
          </div>

          <Table
            loading={loading}
            columns={columns}
            dataSource={fluctuations}
            rowKey='id'
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
            }}
            locale={{
              emptyText: <Empty description='Không có dữ liệu biến động giá' />,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>
    </div>
  );
}
