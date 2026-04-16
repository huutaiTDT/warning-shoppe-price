/** @format */

import { formatPrice } from "@/lib/utils";
import { dashboardAPI } from "@/services/api";
import {
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Progress,
  Row,
  Statistic,
  Table,
} from "antd";
import {
  BarChart3,
  ChevronRight,
  CircleAlert,
  Package,
  Store,
  Timer,
  TrendingDown,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

type StatModalKey =
  | "shops"
  | "products"
  | "crawls"
  | "under"
  | "above"
  | "pending"
  | null;

type ShopLinePoint = {
  shopId: string;
  shopName: string;
  shopCode: string;
  underRatePercent: number;
  x: number;
  y: number;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any | null>(null);
  const [statModal, setStatModal] = useState<StatModalKey>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await dashboardAPI.getOverview();
        setOverview(res.data || null);
      } catch (error) {
        console.error("Error fetching dashboard overview:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, []);

  const stats = overview?.stats || {};
  const topShopsUnderPrice = overview?.topShopsUnderPrice || [];
  const crawlStatusSummary = overview?.crawlStatusSummary || {
    completed: 0,
    failed: 0,
    pending: 0,
  };
  const productsUnderPrice = overview?.underPricePreview || [];

  const maxUnderShopCount =
    topShopsUnderPrice.length > 0 ?
      Math.max(...topShopsUnderPrice.map((item: any) => item.underCount || 0))
    : 1;

  const topProductsUnderPrice = productsUnderPrice.slice(0, 10);
  const maxProductDiscount =
    topProductsUnderPrice.length > 0 ?
      Math.max(
        ...topProductsUnderPrice.map((item: any) =>
          Number(item.discountAmount || 0),
        ),
      )
    : 1;

  const lineChartData: Array<Omit<ShopLinePoint, "x" | "y">> =
    topShopsUnderPrice.slice(0, 10).map((item: any) => ({
      shopId: item.shopId,
      shopName: item.shopName || "Không rõ",
      shopCode: item.shopCode || "",
      underRatePercent: Number((Number(item.underRate || 0) * 100).toFixed(2)),
    }));

  const chartWidth = 760;
  const chartHeight = 260;
  const chartPadding = { top: 20, right: 20, bottom: 56, left: 36 };
  const innerWidth = chartWidth - chartPadding.left - chartPadding.right;
  const innerHeight = chartHeight - chartPadding.top - chartPadding.bottom;
  const linePoints: ShopLinePoint[] = lineChartData.map(
    (item, index: number) => {
      const x =
        lineChartData.length === 1 ?
          chartPadding.left + innerWidth / 2
        : chartPadding.left + (index / (lineChartData.length - 1)) * innerWidth;
      const y =
        chartPadding.top +
        innerHeight -
        (Math.min(item.underRatePercent, 100) / 100) * innerHeight;
      return { ...item, x, y };
    },
  );
  const linePath = linePoints
    .map((p: ShopLinePoint, i: number) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  const totalWithOriginal = Number(stats.totalWithOriginalPrice || 0);
  const aboveRate =
    totalWithOriginal > 0 ?
      Math.round((Number(stats.totalAbovePrice || 0) / totalWithOriginal) * 100)
    : 0;

  const crawlDoneRate =
    Number(stats.totalCrawls || 0) > 0 ?
      Math.round(
        (Number(crawlStatusSummary.completed || 0) /
          Number(stats.totalCrawls || 0)) *
          100,
      )
    : 0;

  const modalProductColumns = [
    {
      title: "Sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (value: string) => <span className='truncate'>{value}</span>,
    },
    {
      title: "Shop",
      key: "shop",
      render: (_: any, record: any) => (
        <span>
          {record.shopCode ? `[${record.shopCode}] ` : ""}
          {record.shopName || "Không rõ"}
        </span>
      ),
    },
    {
      title: "Tiết kiệm",
      dataIndex: "discountAmount",
      key: "discountAmount",
      render: (value: number) => (
        <span className='text-red-500 font-semibold'>
          -{formatPrice(value || 0)}
        </span>
      ),
    },
  ];

  const renderModalBody = () => {
    if (statModal === "shops") {
      return (
        <div className='space-y-3'>
          <div className='text-xs text-gray-400'>
            Top shop có sản phẩm dưới niêm yết (xếp theo số lượng)
          </div>
          {topShopsUnderPrice.length === 0 ?
            <Empty description='Chưa có dữ liệu' />
          : topShopsUnderPrice.slice(0, 8).map((item: any) => {
              const widthPercent = Math.max(
                6,
                Math.round(
                  (Number(item.underCount || 0) / maxUnderShopCount) * 100,
                ),
              );

              return (
                <div key={item.shopId}>
                  <div className='flex items-center justify-between text-xs mb-1'>
                    <span className='truncate pr-2'>
                      {item.shopCode ? `[${item.shopCode}] ` : ""}
                      {item.shopName}
                    </span>
                    <span className='text-gray-400'>
                      {item.underCount}/{item.totalWithOriginal}
                    </span>
                  </div>
                  <div className='w-full h-2 rounded bg-gray-800'>
                    <div
                      className='h-2 rounded bg-emerald-500'
                      style={{ width: `${widthPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          }
        </div>
      );
    }

    if (statModal === "products" || statModal === "under") {
      return (
        <Table
          columns={modalProductColumns}
          dataSource={topProductsUnderPrice}
          rowKey='id'
          pagination={false}
          size='small'
        />
      );
    }

    if (statModal === "crawls" || statModal === "pending") {
      return (
        <div className='space-y-4'>
          <Progress percent={crawlDoneRate} status='active' />
          <div className='grid grid-cols-3 gap-3'>
            <div className='rounded border border-gray-800 p-3 text-center'>
              <div className='text-xs text-gray-400'>Completed</div>
              <div className='text-lg font-semibold text-emerald-500'>
                {crawlStatusSummary.completed || 0}
              </div>
            </div>
            <div className='rounded border border-gray-800 p-3 text-center'>
              <div className='text-xs text-gray-400'>Pending</div>
              <div className='text-lg font-semibold text-amber-500'>
                {crawlStatusSummary.pending || 0}
              </div>
            </div>
            <div className='rounded border border-gray-800 p-3 text-center'>
              <div className='text-xs text-gray-400'>Failed</div>
              <div className='text-lg font-semibold text-red-500'>
                {crawlStatusSummary.failed || 0}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (statModal === "above") {
      return (
        <div className='space-y-4'>
          <Progress percent={aboveRate} strokeColor='#ef4444' />
          <div className='text-sm text-gray-400'>
            {stats.totalAbovePrice || 0} / {totalWithOriginal || 0} sản phẩm
            đang cao hơn giá niêm yết.
          </div>
        </div>
      );
    }

    return null;
  };

  const modalTitleMap: Record<string, string> = {
    shops: "Chi tiết theo Shop",
    products: "Chi tiết theo Sản phẩm",
    crawls: "Tình trạng Crawl",
    under: "Sản phẩm dưới niêm yết",
    above: "Sản phẩm cao hơn niêm yết",
    pending: "Crawl đang chờ",
  };

  return (
    <div className='overflow-hidden bg-[#101828]'>
      <Row>
        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={loading}
            className='cursor-pointer'
            onClick={() => setStatModal("shops")}>
            <Statistic
              title='Tổng cửa hàng'
              value={stats.totalShops || 0}
              prefix={<Store size={18} className='text-emerald-500' />}
            />
            <Link to='/dashboard/shops'>
              <Button type='text' size='large' className='w-full mt-3'>
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={loading}
            className='cursor-pointer'
            onClick={() => setStatModal("products")}>
            <Statistic
              title='Tổng sản phẩm'
              value={stats.totalProducts || 0}
              prefix={<Package size={18} className='text-blue-500' />}
            />
            <Link to='/dashboard/products'>
              <Button type='text' size='large' className='w-full mt-3'>
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={loading}
            className='cursor-pointer'
            onClick={() => setStatModal("crawls")}>
            <Statistic
              title='Lịch sử quét'
              value={stats.totalCrawls || 0}
              prefix={<BarChart3 size={18} className='text-purple-500' />}
            />
            <Link to='/dashboard/crawl-history'>
              <Button type='text' size='large' className='w-full mt-3'>
                Xem tất cả <ChevronRight size={14} />
              </Button>
            </Link>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={loading}
            className='cursor-pointer'
            onClick={() => setStatModal("under")}>
            <Statistic
              title='Sản phẩm dưới niêm yết'
              value={stats.totalUnderPrice || 0}
              prefix={<TrendingDown size={18} className='text-yellow-500' />}
            />
            <div className='mt-3 text-xs text-gray-400'>
              Có giá niêm yết: {stats.totalWithOriginalPrice || 0}
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={loading}
            className='cursor-pointer'
            onClick={() => setStatModal("above")}>
            <Statistic
              title='Sản phẩm cao hơn niêm yết'
              value={stats.totalAbovePrice || 0}
              prefix={<CircleAlert size={18} className='text-red-500' />}
            />
            <div className='mt-3 text-xs text-gray-400'>
              Cần theo dõi giá bán hiện tại
            </div>
          </Card>
        </Col>

        <Col xs={24} sm={12} lg={8}>
          <Card
            loading={loading}
            className='cursor-pointer'
            onClick={() => setStatModal("pending")}>
            <Statistic
              title='Crawl đang chờ'
              value={crawlStatusSummary.pending || 0}
              prefix={<Timer size={18} className='text-amber-500' />}
            />
            <div className='mt-3 text-xs text-gray-400'>
              Completed: {crawlStatusSummary.completed || 0} | Failed:{" "}
              {crawlStatusSummary.failed || 0}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card
            loading={loading}
            title={
              <div className='flex items-center gap-2'>
                <TrendingDown size={16} className='text-emerald-500' />
                <span className='text-sm'>
                  Top shop có sản phẩm dưới niêm yết
                </span>
              </div>
            }>
            {topShopsUnderPrice.length === 0 ?
              <Empty description='Chưa có dữ liệu' />
            : <div className='space-y-3'>
                {topShopsUnderPrice.map((item: any) => {
                  const widthPercent = Math.max(
                    6,
                    Math.round(
                      (Number(item.underCount || 0) / maxUnderShopCount) * 100,
                    ),
                  );

                  return (
                    <div key={item.shopId}>
                      <div className='flex items-center justify-between text-xs mb-1'>
                        <div className='truncate pr-2'>
                          {item.shopCode ? `[${item.shopCode}] ` : ""}
                          {item.shopName}
                        </div>
                        <div className='text-gray-400'>
                          {item.underCount} / {item.totalWithOriginal}
                        </div>
                      </div>
                      <div className='w-full h-2 rounded bg-gray-800'>
                        <div
                          className='h-2 rounded bg-emerald-500'
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <div className='text-[11px] text-gray-500 mt-1'>
                        Tỷ lệ dưới niêm yết:{" "}
                        {(Number(item.underRate || 0) * 100).toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            loading={loading}
            title={
              <div className='flex items-center gap-2'>
                <BarChart3 size={16} className='text-blue-500' />
                <span className='text-sm'>Top hàng hóa dưới niêm yết</span>
              </div>
            }>
            {topProductsUnderPrice.length === 0 ?
              <Empty description='Chưa có dữ liệu' />
            : <div className='space-y-3'>
                {topProductsUnderPrice.map((item: any) => {
                  const widthPercent = Math.max(
                    6,
                    Math.round(
                      (Number(item.discountAmount || 0) / maxProductDiscount) *
                        100,
                    ),
                  );

                  return (
                    <div key={item.id}>
                      <div className='flex items-center justify-between text-xs mb-1'>
                        <div className='truncate pr-2'>
                          {item.name || "Không rõ sản phẩm"}
                        </div>
                        <div className='text-red-400 font-semibold'>
                          -{formatPrice(item.discountAmount || 0)}
                        </div>
                      </div>
                      <div className='text-[11px] text-gray-500 mb-1'>
                        {item.shopCode ? `[${item.shopCode}] ` : ""}
                        {item.shopName || "Không rõ shop"}
                      </div>
                      <div className='w-full h-2 rounded bg-gray-800'>
                        <div
                          className='h-2 rounded bg-blue-500'
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>
                      <div className='text-[11px] text-gray-500 mt-1'>
                        {formatPrice(item.priceMin)} /{" "}
                        <span className='line-through'>
                          {formatPrice(item.priceOriginal)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            }
          </Card>
        </Col>
      </Row>

      <Card
        loading={loading}
        title={
          <div className='flex items-center gap-2'>
            <BarChart3 size={16} className='text-cyan-400' />
            <span className='text-sm'>
              Line chart: Tỷ lệ sản phẩm dưới niêm yết theo shop
            </span>
          </div>
        }>
        {lineChartData.length === 0 ?
          <Empty description='Chưa có dữ liệu line chart' />
        : <div className='overflow-x-auto'>
            <svg
              width={chartWidth}
              height={chartHeight}
              role='img'
              aria-label='Line chart ty le duoi niem yet theo shop'>
              <line
                x1={chartPadding.left}
                y1={chartPadding.top + innerHeight}
                x2={chartPadding.left + innerWidth}
                y2={chartPadding.top + innerHeight}
                stroke='#334155'
              />
              <line
                x1={chartPadding.left}
                y1={chartPadding.top}
                x2={chartPadding.left}
                y2={chartPadding.top + innerHeight}
                stroke='#334155'
              />

              {[0, 25, 50, 75, 100].map((tick) => {
                const y =
                  chartPadding.top + innerHeight - (tick / 100) * innerHeight;
                return (
                  <g key={tick}>
                    <line
                      x1={chartPadding.left}
                      y1={y}
                      x2={chartPadding.left + innerWidth}
                      y2={y}
                      stroke='#1f2937'
                      strokeDasharray='2 4'
                    />
                    <text x={8} y={y + 4} fill='#94a3b8' fontSize='10'>
                      {tick}%
                    </text>
                  </g>
                );
              })}

              <path
                d={linePath}
                fill='none'
                stroke='#06b6d4'
                strokeWidth='2.5'
              />

              {linePoints.map((p: ShopLinePoint) => (
                <g key={p.shopId}>
                  <circle cx={p.x} cy={p.y} r='4' fill='#22d3ee' />
                  <text
                    x={p.x}
                    y={p.y - 10}
                    textAnchor='middle'
                    fill='#e2e8f0'
                    fontSize='10'>
                    {p.underRatePercent.toFixed(1)}%
                  </text>
                  <text
                    x={p.x}
                    y={chartHeight - 24}
                    textAnchor='middle'
                    fill='#94a3b8'
                    fontSize='10'>
                    {p.shopCode ?
                      `[${p.shopCode}]`
                    : `Shop ${linePoints.indexOf(p) + 1}`}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        }
      </Card>

      <div className='flex justify-end'>
        <Link to='/dashboard/products'>
          <Button type='primary'>
            Xem toàn bộ sản phẩm <ChevronRight size={14} />
          </Button>
        </Link>
      </div>

      <Modal
        open={Boolean(statModal)}
        onCancel={() => setStatModal(null)}
        footer={null}
        width={"fit-content"}
        title={statModal ? modalTitleMap[statModal] : "Chi tiết"}>
        {renderModalBody()}
      </Modal>
    </div>
  );
}
