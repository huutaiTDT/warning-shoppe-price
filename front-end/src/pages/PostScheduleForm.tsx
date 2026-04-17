/** @format */

import {
  accountSettingsAPI,
  postSchedulesAPI,
  productsAPI,
} from "@/services/api";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Spin,
  message,
} from "antd";
import dayjs from "dayjs";
import { ArrowLeft, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const PLATFORM_OPTIONS = [
  { label: "Facebook", value: "facebook" },
  { label: "TikTok", value: "tiktok" },
  { label: "Threads", value: "threads" },
  { label: "Instagram", value: "instagram" },
];

export default function PostScheduleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();

  const [products, setProducts] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = useMemo(() => Boolean(id), [id]);

  const fetchDependencies = async () => {
    try {
      const [productsRes, accountsRes] = await Promise.all([
        productsAPI.list(1, 1000),
        accountSettingsAPI.list(1, 1000),
      ]);

      setProducts(productsRes.data.products || []);
      setAccounts(accountsRes.data.items || []);
    } catch {
      message.error("Không tải được dữ liệu phụ trợ");
    }
  };

  const fetchDetail = async (scheduleId: string) => {
    setLoading(true);
    try {
      const res = await postSchedulesAPI.get(scheduleId);
      const data = res.data || {};

      form.setFieldsValue({
        title: data.title || "",
        description: data.description || "",
        galleriesText:
          Array.isArray(data.galleries) ? data.galleries.join("\n") : "",
        publishDate:
          data.publishDate ?
            dayjs(data.publishDate)
          : dayjs().add(10, "minute"),
        retryMax: data.retryMax || 3,
        productId: data.productId || undefined,
        accountSettingIds: (data.targets || []).map(
          (target: any) => target.accountSettingId,
        ),
        platforms: Array.from(
          new Set((data.targets || []).map((target: any) => target.platform)),
        ),
      });
    } catch {
      message.error("Không tải được chi tiết lịch bài viết");
      navigate("/dashboard/post-schedules");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    if (id) {
      fetchDetail(id);
      return;
    }

    form.setFieldsValue({
      title: "",
      description: "",
      galleriesText: "",
      publishDate: dayjs().add(10, "minute"),
      retryMax: 3,
      productId: undefined,
      accountSettingIds: [],
      platforms: [],
    });
  }, [id]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        title: values.title,
        description: values.description,
        galleries: (values.galleriesText || "")
          .split("\n")
          .map((x: string) => x.trim())
          .filter(Boolean),
        publishDate: values.publishDate?.toISOString(),
        retryMax: Number(values.retryMax || 3),
        productId: values.productId || undefined,
        accountSettingIds: values.accountSettingIds || [],
        platforms: values.platforms || [],
      };

      if (id) {
        await postSchedulesAPI.update(id, payload);
        message.success("Cập nhật lịch bài viết thành công");
      } else {
        await postSchedulesAPI.create(payload);
        message.success("Tạo lịch bài viết thành công");
      }

      navigate("/dashboard/post-schedules");
    } catch {
      // noop
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div className='space-y-4 relative'>
      <div className='flex sticky top-0 z-1000 backdrop-blur-3xl left-0 right-0 items-center justify-between gap-2'>
        <Space>
          <Button
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate("/dashboard/post-schedules")}>
            Quay lại
          </Button>
          <h2 className='text-white text-base font-semibold m-0'>
            {isEdit ? "Cập nhật lịch bài viết" : "Tạo lịch bài viết mới"}
          </h2>
        </Space>

        <Button
          type='primary'
          icon={<Save size={14} />}
          loading={saving}
          onClick={handleSubmit}>
          {isEdit ? "Lưu cập nhật" : "Lưu lịch bài viết"}
        </Button>
      </div>

      <Card className='bg-gray-800 border-gray-700'>
        <Form form={form} layout='vertical'>
          <Form.Item
            label='Tiêu đề'
            name='title'
            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}>
            <Input placeholder='Tiêu đề bài viết' />
          </Form.Item>

          <Form.Item label='Mô tả' name='description'>
            <Input.TextArea rows={4} placeholder='Mô tả bài viết' />
          </Form.Item>

          <Form.Item label='Galleries (mỗi dòng 1 URL)' name='galleriesText'>
            <Input.TextArea rows={4} placeholder='https://...\nhttps://...' />
          </Form.Item>

          <Form.Item
            label='Publish Date'
            name='publishDate'
            rules={[
              { required: true, message: "Vui lòng chọn thời gian publish" },
            ]}>
            <DatePicker showTime className='w-full' />
          </Form.Item>

          <Form.Item label='Số lần retry tối đa' name='retryMax'>
            <Input type='number' min={1} max={10} />
          </Form.Item>

          <Form.Item label='Sản phẩm liên quan' name='productId'>
            <Select
              allowClear
              showSearch
              placeholder='Chọn sản phẩm'
              options={products.map((item: any) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>

          <Form.Item label='Nền tảng' name='platforms'>
            <Select
              mode='multiple'
              options={PLATFORM_OPTIONS}
              placeholder='Chọn nền tảng'
            />
          </Form.Item>

          <Form.Item label='Account Settings' name='accountSettingIds'>
            <Select
              mode='multiple'
              placeholder='Chọn account settings'
              options={accounts.map((item: any) => ({
                value: item.id,
                label: `${item.name} (${item.platform})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
