/** @format */

import { shopsAPI } from "@/services/api";
import { Popover, Spin, Tag } from "antd";
import { useMemo, useState } from "react";

type ShopSnapshotPopoverProps = {
  shopId?: string;
  shopName?: string;
  shopCode?: string | null;
  shopPlatform?: string | null;
  children: React.ReactNode;
};

type SnapshotData = {
  id: string;
  name: string;
  code?: string | null;
  platform?: string | null;
  url?: string;
  brandNames: string[];
  productCount: number;
};

const snapshotCache = new Map<string, SnapshotData>();

export default function ShopSnapshotPopover({
  shopId,
  shopName,
  shopCode,
  shopPlatform,
  children,
}: ShopSnapshotPopoverProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);

  const fallbackSnapshot = useMemo(() => {
    if (!shopId) return null;
    return {
      id: shopId,
      name: shopName || "Không rõ",
      code: shopCode || null,
      platform: shopPlatform || null,
      url: "",
      brandNames: [],
      productCount: 0,
    } satisfies SnapshotData;
  }, [shopCode, shopId, shopName, shopPlatform]);

  const fetchSnapshot = async () => {
    if (!shopId) return;

    if (snapshotCache.has(shopId)) {
      setSnapshot(snapshotCache.get(shopId) || null);
      return;
    }

    setLoading(true);
    try {
      const [shopRes, countRes] = await Promise.all([
        shopsAPI.get(shopId),
        shopsAPI.getProducts(shopId, true),
      ]);

      const shop = shopRes.data || {};
      const brandNames =
        shop.shop_brands
          ?.map((sb: any) => sb.master_brands?.name)
          .filter(Boolean) || [];

      const nextSnapshot: SnapshotData = {
        id: shop.id || shopId,
        name: shop.name || shopName || "Không rõ",
        code: shop.code || shopCode || null,
        platform: shop.platform || shopPlatform || null,
        url: shop.url || "",
        brandNames,
        productCount: Number(countRes?.data?.count || 0),
      };

      snapshotCache.set(shopId, nextSnapshot);
      setSnapshot(nextSnapshot);
    } catch {
      setSnapshot(fallbackSnapshot);
    } finally {
      setLoading(false);
    }
  };

  if (!shopId) {
    return <>{children}</>;
  }

  return (
    <Popover
      trigger='hover'
      placement='topLeft'
      mouseEnterDelay={0.2}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen && !snapshot && !loading) {
          fetchSnapshot();
        }
      }}
      content={
        <div className='min-w-64 max-w-86'>
          {loading ?
            <div className='flex items-center gap-2 py-2'>
              <Spin size='small' />
              <span className='text-xs text-gray-500'>
                Đang tải thông tin shop...
              </span>
            </div>
          : <div className='space-y-2'>
              <div className='text-sm font-semibold'>
                {snapshot?.code ? `[${snapshot.code}] ` : ""}
                {snapshot?.name || shopName || "Không rõ"}
              </div>

              <div className='flex flex-wrap gap-1'>
                {snapshot?.platform && (
                  <Tag color='blue'>{snapshot.platform}</Tag>
                )}
                <Tag color='gold'>SP: {snapshot?.productCount ?? 0}</Tag>
              </div>

              {snapshot?.url && (
                <div className='text-xs text-gray-500 break-all'>
                  URL: {snapshot.url}
                </div>
              )}

              <div className='text-xs text-gray-500'>
                Thương hiệu: {snapshot?.brandNames?.length || 0}
              </div>

              {snapshot?.brandNames && snapshot.brandNames.length > 0 && (
                <div className='flex flex-wrap gap-1'>
                  {snapshot.brandNames.slice(0, 5).map((name) => (
                    <Tag key={name}>{name}</Tag>
                  ))}
                  {snapshot.brandNames.length > 5 && (
                    <Tag>+{snapshot.brandNames.length - 5}</Tag>
                  )}
                </div>
              )}
            </div>
          }
        </div>
      }>
      <span>{children}</span>
    </Popover>
  );
}
