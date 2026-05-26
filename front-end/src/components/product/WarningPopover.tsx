/** @format */

import { formatPrice } from "@/lib/utils";
import { Badge, Popover, Space, Table } from "antd";
import { AlertCircle } from "lucide-react";

interface WarningProduct {
  id: string;
  name: string;
  price_min: number;
  price_max: number;
  original_price: number;
  shop_id: string;
  shop_name: string;
  shop_code: string;
  shop_platform: string;
  delta: number;
}

interface WarningPopoverProps {
  warningCount: number;
  warnings: WarningProduct[];
  listedPrice: number;
}

export default function WarningPopover({
  warningCount,
  warnings,
  listedPrice,
}: WarningPopoverProps) {
  // Only show if warning count > 0
  if (warningCount <= 0) {
    return null;
  }

  const columns = [
    {
      title: "Sản phẩm",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className='font-medium'>{text}</span>,
    },
    {
      title: "Giá Min",
      dataIndex: "price_min",
      key: "price_min",
      render: (price: number) => `₫${formatPrice(price)}`,
    },
    {
      title: "Giá Max",
      dataIndex: "price_max",
      key: "price_max",
      render: (price: number) => `${formatPrice(price)}`,
    },
    {
      title: "Shop",
      key: "shop",
      render: (_: any, record: WarningProduct) => (
        <Space direction='vertical' size={0}>
          <div className='font-medium'>{record.shop_name}</div>
          <div className='text-xs text-gray-500'>
            {record.shop_code} • {record.shop_platform}
          </div>
        </Space>
      ),
    },
    {
      title: "Chênh lệch",
      dataIndex: "delta",
      key: "delta",
      render: (delta: number) => (
        <span
          className={delta < 0 ? "text-red-600 font-bold" : "text-green-600"}>
          {delta < 0 ? "-" : "+"}₫{Math.abs(delta)?.toLocaleString()}
        </span>
      ),
    },
  ];

  const content = (
    <div className='w-full'>
      <div className='mb-3 pb-2 border-b'>
        <div className='text-sm font-semibold'>
          Cảnh báo: {warningCount} sản phẩm có giá thấp hơn{" "}
          {listedPrice?.toLocaleString()} đ
        </div>
        <div className='text-xs text-gray-500 mt-1'>
          Các cửa hàng đang bán với giá nhấp hơn giá niêm yết
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={warnings}
        rowKey='id'
        pagination={false}
        size='small'
        scroll={{ x: 800 }}
        className='text-xs'
      />
    </div>
  );

  return (
    <Popover
      content={content}
      title='Chi tiết cảnh báo giá'
      trigger='hover'
      placement='left'
      overlayStyle={{ width: "900px" }}>
      <Badge
        count={warningCount}
        color='#ff4d4f'
        className='cursor-pointer hover:opacity-80 transition'>
        <div className='inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition'>
          <AlertCircle size={16} />
          <span className='text-sm font-semibold'>{warningCount}</span>
        </div>
      </Badge>
    </Popover>
  );
}
