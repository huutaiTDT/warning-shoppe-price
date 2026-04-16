/** @format */

import { QuickCreateBrandPopover } from "@/components/quick-create/MasterDataQuickCreate";
import { brandsAPI, shopsAPI } from "@/services/api";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Card, Form, Input, Select, Space, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

const PLATFORM_OPTIONS = [
  { label: "Shopee", value: "shopee" },
  { label: "Lazada", value: "lazada" },
  { label: "TikTok Shop", value: "tiktok" },
  { label: "Khác", value: "other" },
];

export default function ShopFormPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const isEdit = useMemo(() => Boolean(id && id !== "new"), [id]);

  // Fetch brands list
  const fetchBrands = async () => {
    setBrandLoading(true);
    try {
      const res = await brandsAPI.list(1, 1000);
      setBrands(res.data.brands || []);
    } catch (error) {
      message.error("Lỗi tải danh sách thương hiệu");
    } finally {
      setBrandLoading(false);
    }
  };

  // Helper: Generate code from URL
  const generateCodeFromUrl = (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const shopSlug = pathname.replace(/^\//, "").split("?")[0];
      if (!shopSlug) return "";

      const code = shopSlug
        .split("/")[0]
        .toUpperCase()
        .replace(/-/g, "_")
        .replace(/[^A-Z0-9_]/g, "");

      return code;
    } catch {
      return "";
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    const fetchShop = async () => {
      setLoading(true);
      try {
        const res = await shopsAPI.get(id);
        const shop = res.data || {};
        const brandIds = shop.shop_brands?.map((sb: any) => sb.brand_id) || [];
        form.setFieldsValue({
          code: shop.code,
          name: shop.name,
          url: shop.url,
          platform: shop.platform,
          brand_ids: brandIds,
        });
      } catch (error) {
        message.error("Không tải được thông tin cửa hàng");
        navigate("/dashboard/shops");
      } finally {
        setLoading(false);
      }
    };

    fetchShop();
  }, [form, id, isEdit, navigate]);

  const handleUrlChange = () => {
    const url = form.getFieldValue("url");
    if (url) {
      const code = generateCodeFromUrl(url);
      form.setFieldValue("code", code);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload: any = {
        name: values.name.trim(),
        url: values.url.trim(),
        platform: values.platform,
        code: values.code || undefined,
        brand_ids: values.brand_ids || [],
      };

      if (isEdit && id) {
        await shopsAPI.update(id, payload);
        message.success("Cập nhật cửa hàng thành công");
      } else {
        await shopsAPI.create(payload);
        message.success("Tạo cửa hàng thành công");
      }

      navigate("/dashboard/shops");
    } catch (error: any) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        isEdit ? "Cập nhật cửa hàng thất bại" : "Tạo cửa hàng thất bại",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      <Space>
        <Link to='/dashboard/shops'>
          <Button icon={<ArrowLeftOutlined />}>Quay lại</Button>
        </Link>
        <h1 className='text-white text-lg font-semibold m-0'>
          {isEdit ? "Chỉnh sửa cửa hàng" : "Thêm cửa hàng mới"}
        </h1>
      </Space>

      <Card>
        <Form form={form} layout='vertical' disabled={loading}>
          <Form.Item
            label='Tên cửa hàng'
            name='name'
            rules={[
              { required: true, message: "Vui lòng nhập tên cửa hàng" },
              { min: 2, message: "Tên cửa hàng phải có ít nhất 2 ký tự" },
            ]}>
            <Input placeholder='Nhập tên cửa hàng' maxLength={255} />
          </Form.Item>

          <Form.Item
            label='URL cửa hàng'
            name='url'
            rules={[
              { required: true, message: "Vui lòng nhập URL cửa hàng" },
              { type: "url", message: "URL không hợp lệ" },
            ]}>
            <Input
              placeholder='https://shopee.vn/ten-shop'
              maxLength={500}
              onBlur={handleUrlChange}
            />
          </Form.Item>

          <Form.Item
            label='Nền tảng'
            name='platform'
            rules={[{ required: true, message: "Vui lòng chọn nền tảng" }]}>
            <Select options={PLATFORM_OPTIONS} placeholder='Chọn nền tảng' />
          </Form.Item>

          <Form.Item
            label='Mã cửa hàng'
            name='code'
            rules={[
              {
                required: isEdit ? false : true,
                message: "Vui lòng nhập mã cửa hàng",
              },
            ]}>
            <Input placeholder='Tự sinh từ URL' maxLength={100} />
          </Form.Item>

          <Form.Item
            label={
              <div className='flex items-center gap-2'>
                <span>Thương hiệu</span>
                <QuickCreateBrandPopover
                  disabled={loading}
                  onCreated={async (brand) => {
                    await fetchBrands();

                    if (brand?.id) {
                      const currentBrandIds =
                        form.getFieldValue("brand_ids") || [];
                      const nextBrandIds = Array.from(
                        new Set([...currentBrandIds, brand.id]),
                      );
                      form.setFieldValue("brand_ids", nextBrandIds);
                    }
                  }}
                />
              </div>
            }
            name='brand_ids'
            rules={[
              {
                required: false,
                message: "Vui lòng chọn ít nhất một thương hiệu",
              },
            ]}>
            <Select
              mode='multiple'
              loading={brandLoading}
              placeholder='Chọn thương hiệu'
              options={brands.map((b: any) => ({ label: b.name, value: b.id }))}
            />
          </Form.Item>

          <Space>
            <Button type='primary' loading={loading} onClick={handleSubmit}>
              {isEdit ? "Lưu thay đổi" : "Tạo cửa hàng"}
            </Button>
            <Link to='/dashboard/shops'>
              <Button disabled={loading}>Hủy</Button>
            </Link>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
