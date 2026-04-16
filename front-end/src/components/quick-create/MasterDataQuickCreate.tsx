/** @format */

import { brandsAPI, shopsAPI } from "@/services/api";
import { Button, Input, Popover, Select, Space, message } from "antd";
import { Plus } from "lucide-react";
import { useState } from "react";

type QuickCreateBrandPopoverProps = {
  disabled?: boolean;
  onCreated?: (brand: any) => void | Promise<void>;
};

type QuickCreateShopPopoverProps = {
  disabled?: boolean;
  onCreated?: (shop: any) => void | Promise<void>;
};

const SHOP_PLATFORM_OPTIONS = [
  { label: "Shopee", value: "shopee" },
  { label: "Lazada", value: "lazada" },
  { label: "TikTok Shop", value: "tiktok" },
  { label: "Khác", value: "other" },
];

export function QuickCreateBrandPopover({
  disabled,
  onCreated,
}: QuickCreateBrandPopoverProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const resetState = () => {
    setName("");
    setCode("");
    setDescription("");
  };

  const handleCreateBrand = async () => {
    if (!name.trim()) {
      message.warning("Vui lòng nhập tên thương hiệu");
      return;
    }

    setSaving(true);
    try {
      const response = await brandsAPI.create({
        name: name.trim(),
        code: code.trim() || undefined,
        description: description.trim() || undefined,
        is_active: true,
      });

      message.success("Tạo thương hiệu thành công");
      await onCreated?.(response.data);
      resetState();
      setOpen(false);
    } catch {
      message.error("Không thể tạo thương hiệu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      trigger='click'
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) {
          setOpen(nextOpen);
        }
      }}
      content={
        <Space direction='vertical' className='w-84'>
          <Input
            placeholder='Tên thương hiệu *'
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
          />
          <Input
            placeholder='Mã thương hiệu (tuỳ chọn)'
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={100}
          />
          <Input.TextArea
            placeholder='Mô tả (tuỳ chọn)'
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
          />
          <Space>
            <Button type='primary' loading={saving} onClick={handleCreateBrand}>
              Tạo thương hiệu
            </Button>
            <Button
              disabled={saving}
              onClick={() => {
                setOpen(false);
              }}>
              Hủy
            </Button>
          </Space>
        </Space>
      }
      title='Tạo nhanh thương hiệu'>
      <Button
        size='small'
        icon={<Plus size={14} />}
        disabled={disabled}
        type='dashed'>
        Tạo nhanh
      </Button>
    </Popover>
  );
}

export function QuickCreateShopPopover({
  disabled,
  onCreated,
}: QuickCreateShopPopoverProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<string>("shopee");

  const resetState = () => {
    setName("");
    setUrl("");
    setPlatform("shopee");
  };

  const handleCreateShop = async () => {
    if (!name.trim() || !url.trim() || !platform) {
      message.warning("Vui lòng nhập đủ tên shop, URL và nền tảng");
      return;
    }

    setSaving(true);
    try {
      const response = await shopsAPI.create({
        name: name.trim(),
        url: url.trim(),
        platform,
      });

      message.success("Tạo shop thành công");
      await onCreated?.(response.data);
      resetState();
      setOpen(false);
    } catch {
      message.error("Không thể tạo shop");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Popover
      trigger='click'
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) {
          setOpen(nextOpen);
        }
      }}
      content={
        <Space direction='vertical' className='w-84'>
          <Input
            placeholder='Tên shop *'
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={255}
          />
          <Input
            placeholder='URL shop * (https://...)'
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            maxLength={500}
          />
          <Select
            value={platform}
            options={SHOP_PLATFORM_OPTIONS}
            onChange={setPlatform}
            placeholder='Chọn nền tảng'
          />
          <Space>
            <Button type='primary' loading={saving} onClick={handleCreateShop}>
              Tạo shop
            </Button>
            <Button
              disabled={saving}
              onClick={() => {
                setOpen(false);
              }}>
              Hủy
            </Button>
          </Space>
        </Space>
      }
      title='Tạo nhanh shop'>
      <Button
        size='small'
        icon={<Plus size={14} />}
        disabled={disabled}
        type='dashed'>
        Tạo nhanh
      </Button>
    </Popover>
  );
}
