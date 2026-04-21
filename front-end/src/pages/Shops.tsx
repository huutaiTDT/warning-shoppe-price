/** @format */

import Pagination from "@/components/pagination";
import { crawlHistoryAPI, shopsAPI } from "@/services/api";
import { Button, Input, Popconfirm, Space, Table, message } from "antd";
import { Edit, Play, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const normalizeShop = (shop: any) => ({
  ...shop,
  productCount: Number(shop.productCount ?? shop.product_count ?? 0),
  createdAt: shop.createdAt ?? shop.created_at,
});

export default function ShopsPage() {
  const navigate = useNavigate();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20 });
  const [total, setTotal] = useState(0);
  const [crawlProgress, setCrawlProgress] = useState<{
    visible: boolean;
    shopName: string;
    status: "running" | "completed" | "failed";
    percent: number;
    crawledCount: number;
    productCount: number;
    errorMessage: string;
  }>({
    visible: false,
    shopName: "",
    status: "running",
    percent: 0,
    crawledCount: 0,
    productCount: 0,
    errorMessage: "",
  });
  const crawlFakeProgressRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );

  const stopFakeCrawlProgress = () => {
    if (crawlFakeProgressRef.current) {
      clearInterval(crawlFakeProgressRef.current);
      crawlFakeProgressRef.current = null;
    }
  };

  const startFakeCrawlProgress = () => {
    stopFakeCrawlProgress();
    let value = 0;

    crawlFakeProgressRef.current = setInterval(() => {
      value += Math.random() * 10;
      setCrawlProgress((prev) => ({
        ...prev,
        percent: Math.min(90, Math.max(prev.percent, Math.round(value))),
      }));

      if (value >= 90) {
        stopFakeCrawlProgress();
      }
    }, 250);
  };

  const fetchShops = async (page = 1, limit = 20) => {
    setLoading(true);
    try {
      const res = await shopsAPI.list(page, limit, search || undefined);
      const list = (res.data.shops || []).map(normalizeShop);

      const countResults = await Promise.all(
        list.map(async (shop: any) => {
          try {
            const countRes = await shopsAPI.getProducts(shop.id, 1, 10, true);
            return {
              ...shop,
              productCount: Number(
                countRes?.data?.count ?? shop.productCount ?? 0,
              ),
            };
          } catch (error) {
            return shop;
          }
        }),
      );

      setShops(countResults);
      setTotal(res.data.total || 0);
    } catch (error) {
      message.error("Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops(pagination.page, pagination.pageSize);
  }, [search, pagination]);

  useEffect(() => {
    return () => {
      stopFakeCrawlProgress();
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await shopsAPI.delete(id);
      message.success("Xóa thành công");
      fetchShops(pagination.page, pagination.pageSize);
    } catch (error) {
      message.error("Lỗi xóa");
    }
  };

  const handleCrawl = async (id: string, shopName: string) => {
    try {
      setCrawlProgress({
        visible: true,
        shopName,
        status: "running",
        percent: 0,
        crawledCount: 0,
        productCount: 0,
        errorMessage: "",
      });
      startFakeCrawlProgress();

      const crawlRes = await shopsAPI.crawl(id);
      stopFakeCrawlProgress();

      let crawledCount = 0;
      let productCount = 0;

      if (crawlRes?.data?.crawlHistoryId) {
        try {
          const historyRes = await crawlHistoryAPI.get(
            crawlRes.data.crawlHistoryId,
          );
          crawledCount = Number(historyRes?.data?.crawledCount || 0);
          productCount = Number(historyRes?.data?.productCount || 0);
        } catch {
          // Ignore history fetch failure and keep fallback values.
        }
      }

      setCrawlProgress((prev) => ({
        ...prev,
        status: "completed",
        percent: 100,
        crawledCount,
        productCount,
      }));

      message.success("Crawl thành công");
      fetchShops(pagination.page, pagination.pageSize);

      setTimeout(() => {
        setCrawlProgress((prev) => ({ ...prev, visible: false }));
      }, 1800);
    } catch (error) {
      stopFakeCrawlProgress();
      setCrawlProgress((prev) => ({
        ...prev,
        status: "failed",
        percent: 100,
        errorMessage: "Crawl thất bại",
      }));
      message.error("Lỗi quét");
    }
  };

  const columns = [
    {
      title: "Tên cửa hàng",
      dataIndex: "name",
      key: "name",
      width: 200,
    },
    {
      title: "URL",
      dataIndex: "url",
      key: "url",
      width: 250,
      render: (url: string) => (
        <a
          href={url}
          target='_blank'
          rel='noopener noreferrer'
          className='text-emerald-500 hover:text-emerald-400 text-xs truncate'>
          {url}
        </a>
      ),
    },
    {
      title: "Sản phẩm",
      dataIndex: "productCount",
      key: "productCount",
      width: 80,
      align: "right" as const,
    },
    {
      title: "Tạo lúc",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 150,
      render: (date: string) => (
        <span className='text-xs text-gray-400'>
          {date ? new Date(date).toLocaleDateString("vi-VN") : "-"}
        </span>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Space size='large'>
          {!record?.is_sys_product_by_link && (
            <Button
              type='primary'
              size='large'
              icon={<Play size={14} />}
              onClick={() => handleCrawl(record.id, record.name || "Cửa hàng")}
            />
          )}
          <Link to={`/dashboard/shops/${record.id}/edit`}>
            <Button size='large' icon={<Edit size={14} />} />
          </Link>
          <Popconfirm
            title='Xóa?'
            onConfirm={() => handleDelete(record.id)}
            okText='Có'
            cancelText='Không'>
            <Button danger size='large' icon={<Trash2 size={14} />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleRowClick = (record: any) => {
    navigate(`/dashboard/shops/${record.id}`);
  };

  return (
    <div className='space-y-4 h-full flex flex-col'>
      <div className='flex justify-start items-center flex-wrap'>
        <Input
          placeholder='Tìm kiếm cửa hàng...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='flex-1 max-w-sm text-sm'
          style={{
            backgroundColor: "rgb(31 41 55)",
            border: "none",
            color: "white",
          }}
        />
        <Link to='/dashboard/shops/new'>
          <Button type='primary' icon={<Plus />}>
            Thêm
          </Button>
        </Link>
      </div>

      <div className='flex-1 overflow-hidden flex flex-col'>
        <div className='flex-1 overflow-auto'>
          <Table
            columns={columns}
            dataSource={shops}
            loading={loading}
            rowKey='id'
            pagination={false}
            scroll={{ x: 1200, y: "100%" }}
            size='large'
            onRow={(record) => ({
              onClick: () => handleRowClick(record),
              style: { cursor: "pointer" },
            })}
          />
        </div>

        <Pagination
          currentCount={pagination.page}
          pageSize={pagination.pageSize}
          total={total}
          onChange={(page) =>
            setPagination({ page, pageSize: pagination.pageSize })
          }
          page={
            pagination.page > Math.ceil(total / pagination.pageSize) ?
              1
            : pagination.page
          }
        />
      </div>

      {crawlProgress.visible && (
        <div className='fixed bottom-6 right-6 z-50'>
          <div className='bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl w-72 border border-gray-700'>
            <div className='text-sm mb-2 flex justify-between gap-2'>
              <span className='truncate'>
                {crawlProgress.status === "running" ?
                  `Đang crawl: ${crawlProgress.shopName}`
                : crawlProgress.status === "completed" ?
                  `Hoàn tất: ${crawlProgress.shopName}`
                : `Lỗi crawl: ${crawlProgress.shopName}`}
              </span>
              <span>{crawlProgress.percent}%</span>
            </div>

            <div className='w-full bg-gray-700 h-2 rounded'>
              <div
                className={`h-2 rounded transition-all duration-300 ${
                  crawlProgress.status === "failed" ?
                    "bg-red-500"
                  : "bg-green-500"
                }`}
                style={{ width: `${crawlProgress.percent}%` }}
              />
            </div>

            {crawlProgress.status === "completed" && (
              <div className='text-xs text-gray-300 mt-2'>
                Đã cào: {crawlProgress.crawledCount} /{" "}
                {crawlProgress.productCount}
              </div>
            )}

            {crawlProgress.status === "failed" && (
              <div className='text-xs text-red-300 mt-2'>
                {crawlProgress.errorMessage || "Có lỗi xảy ra khi crawl"}
              </div>
            )}

            <div className='mt-2 flex justify-end'>
              <Button
                size='small'
                type='text'
                onClick={() =>
                  setCrawlProgress((prev) => ({ ...prev, visible: false }))
                }>
                Ẩn
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
