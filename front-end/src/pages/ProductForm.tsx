/** @format */

import { normalizeProduct } from "@/lib/product";
import { productsAPI, shopsAPI } from "@/services/api";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Spin,
  message,
} from "antd";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = useMemo(() => Boolean(id), [id]);

  const fetchShops = async () => {
    try {
      const res = await shopsAPI.list(1, 1000);
      setShops(res.data.shops || []);
    } catch (error) {
      message.error("Lỗi tải danh sách shop");
    }
  };

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    try {
      const res = await productsAPI.get(productId);
      const data = normalizeProduct(res.data || {});

      form.setFieldsValue({
        shopeeLink: data.aff_link,
        name: data.name,
        shop_id: data.shopId,
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        priceOriginal: data.priceOriginal,
        rating: data.rating,
        sold: data.sold,
        image: data.thumbnail,
        aff_link: data.aff_link,
        external_id: data.external_id,
        description: data.description,
        brand: data.brand,
      });
    } catch (error) {
      message.error("Không tải được dữ liệu sản phẩm");
      navigate("/dashboard/products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const handleSyncFromShopeeLink = async () => {
    const link = form.getFieldValue("shopeeLink");

    if (!link) {
      message.warning("Nhập link Shopee trước khi đồng bộ");
      return;
    }

    setSyncing(true);
    try {
      const res = await productsAPI.syncFromLink(link);
      const data = res.data || {};

      form.setFieldsValue({
        name: data.name || data.title,
        brand: data.brand,
        image: data.image || data.thumbnail,
        priceMin: data.priceMin ?? data.price_min,
        priceMax: data.priceMax ?? data.price_max,
        priceOriginal:
          data.priceOriginal ?? data.original_price ?? data.price_original,
        rating: data.rating,
        sold: data.sold,
        external_id: data.external_id,
        description: data.description,
        aff_link: data.aff_link || link,
      });

      message.success("Đồng bộ thông tin thành công");
    } catch (error) {
      message.error(
        "Không đồng bộ được từ link Shopee. Vui lòng kiểm tra endpoint /products/sync-from-link",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        name: values.name,
        brand: values.brand,
        shop_id: values.shop_id,
        priceMin: Number(values.priceMin),
        priceMax: Number(values.priceMax),
        price: (Number(values.priceMin) + Number(values.priceMax)) / 2,
        original_price: Number(values.priceOriginal || 0),
        rating: Number(values.rating || 0),
        sold: Number(values.sold || 0),
        image: values.image,
        aff_link: values.aff_link || values.shopeeLink,
        description: values.description,
        external_id: values.external_id,
      };

      if (isEdit && id) {
        await productsAPI.update(id, payload);
        message.success("Cập nhật sản phẩm thành công");
      } else {
        await productsAPI.create(payload);
        message.success("Tạo sản phẩm thành công");
      }

      navigate("/dashboard/products");
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error(
        isEdit ? "Cập nhật sản phẩm thất bại" : "Tạo sản phẩm thất bại",
      );
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
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-2'>
        <Space>
          <Button
            icon={<ArrowLeft size={14} />}
            onClick={() => navigate("/dashboard/products")}>
            Quay lại
          </Button>
          <h2 className='text-white text-base font-semibold m-0'>
            {isEdit ? "Cập nhật sản phẩm" : "Tạo sản phẩm mới"}
          </h2>
        </Space>

        <Button
          type='primary'
          icon={<Save size={14} />}
          loading={saving}
          onClick={handleSubmit}>
          {isEdit ? "Lưu cập nhật" : "Lưu sản phẩm"}
        </Button>
      </div>

      <Card className='bg-gray-800 border-gray-700'>
        <Form layout='vertical' form={form}>
          {!isEdit && (
            <Row gutter={12}>
              <Col span={18}>
                <Form.Item label='Link Shopee' name='shopeeLink'>
                  <Input placeholder='https://shopee.vn/...' />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Button
                  block
                  className='mt-7.5'
                  loading={syncing}
                  icon={<RefreshCw size={14} />}
                  onClick={handleSyncFromShopeeLink}>
                  Đồng bộ
                </Button>
              </Col>
            </Row>
          )}

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                label='Tên sản phẩm'
                name='name'
                rules={[{ required: true, message: "Nhập tên sản phẩm" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label='Shop'
                name='shop_id'
                rules={[{ required: true, message: "Chọn shop" }]}>
                <Select
                  placeholder='Chọn shop'
                  options={shops.map((shop) => ({
                    value: shop.id,
                    label: shop.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item
                label='Giá min'
                name='priceMin'
                rules={[{ required: true, message: "Nhập giá min" }]}>
                <InputNumber className='w-full' min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label='Giá max'
                name='priceMax'
                rules={[{ required: true, message: "Nhập giá max" }]}>
                <InputNumber className='w-full' min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='Giá niêm yết' name='priceOriginal'>
                <InputNumber className='w-full' min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label='Thương hiệu' name='brand'>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='Rating' name='rating'>
                <InputNumber className='w-full' min={0} max={5} step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label='Đã bán' name='sold'>
                <InputNumber className='w-full' min={0} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label='Thumbnail URL' name='image'>
            <Input />
          </Form.Item>
          <Form.Item label='Affiliate Link' name='aff_link'>
            <Input />
          </Form.Item>
          <Form.Item label='External ID' name='external_id'>
            <Input />
          </Form.Item>
          <Form.Item label='Mô tả' name='description'>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
