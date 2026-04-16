/** @format */

import { shopsAPI } from "@/services/api";
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
  const isEdit = useMemo(() => Boolean(id && id !== "new"), [id]);

  useEffect(() => {
    if (!isEdit || !id) {
      return;
    }

    const fetchShop = async () => {
      setLoading(true);
      try {
        const res = await shopsAPI.get(id);
        const shop = res.data || {};
        form.setFieldsValue({
          name: shop.name,
          url: shop.url,
          platform: shop.platform,
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

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const payload = {
        name: values.name.trim(),
        url: values.url.trim(),
        platform: values.platform,
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
            <Input placeholder='https://shopee.vn/ten-shop' maxLength={500} />
          </Form.Item>

          <Form.Item
            label='Nền tảng'
            name='platform'
            rules={[{ required: true, message: "Vui lòng chọn nền tảng" }]}>
            <Select options={PLATFORM_OPTIONS} placeholder='Chọn nền tảng' />
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
