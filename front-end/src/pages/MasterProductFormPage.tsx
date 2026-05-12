/** @format */

import {
  QuickCreateBrandPopover,
  QuickCreateShopPopover,
} from "@/components/quick-create/MasterDataQuickCreate";
import { normalizeProduct } from "@/lib/product";
import { brandsAPI, productsAPI, shopsAPI } from "@/services/api";
import {
  Alert,
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
  Steps,
  message,
} from "antd";
import { ArrowLeft, RefreshCw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function MasterProductFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form] = Form.useForm();
  const [shops, setShops] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [syncedFromShopee, setSyncedFromShopee] = useState(false);
  const [lastSyncedLink, setLastSyncedLink] = useState("");

  const isEdit = useMemo(() => Boolean(id), [id]);
  const isLinkStep = !isEdit && createStep === 0;
  const isDetailStep = isEdit || createStep === 1;
  const createLocked = !isEdit && createStep === 0;

  const fetchShops = async () => {
    try {
      const res = await shopsAPI.list(1, 1000);
      setShops(res.data.shops || []);
    } catch (error) {
      message.error("Lỗi tải danh sách shop");
    }
  };

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

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    try {
      const res = await productsAPI.get(productId);
      const data = normalizeProduct(res.data || {});

      form.setFieldsValue({
        shopeeLink: data.external_link,
        name: data.name,
        shop_id: data.shopId,
        brand: data.brand,
        variants: Array.isArray(data.variants) ? data.variants : [],
        priceMin: data.priceMin,
        priceMax: data.priceMax,
        priceOriginal: data.priceOriginal,
        rating: data.rating,
        sold: data.sold,
        image: data.thumbnail,
        external_link: data.external_link,
        external_id: data.external_id,
        description: data.description,
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
    fetchBrands();
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
        variants: Array.isArray(data.variants) ? data.variants : [],
        image: data.image || data.thumbnail,
        priceMin: data.priceMin ?? data.price_min,
        priceMax: data.priceMax ?? data.price_max,
        priceOriginal:
          data.priceOriginal ?? data.original_price ?? data.price_original,
        rating: data.rating,
        sold: data.sold,
        external_id: data.external_id,
        description: data.description,
        external_link: data.external_link || link,
      });

      setSyncedFromShopee(true);
      setLastSyncedLink(link);
      setCreateStep(1);
      message.success("Đồng bộ thông tin thành công");
    } catch (error) {
      message.error(
        "Không đồng bộ được từ link Shopee. Vui lòng kiểm tra endpoint /products/sync-from-link",
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleContinueToDetailStep = () => {
    const shopeeLink = form.getFieldValue("shopeeLink");

    if (!shopeeLink) {
      message.warning("Bước 1: Nhập Shopee link trước khi tiếp tục");
      return;
    }

    if (!syncedFromShopee || shopeeLink !== lastSyncedLink) {
      message.warning("Bước 1: Cần đồng bộ Shopee link trước khi tiếp tục");
      return;
    }

    setCreateStep(1);
  };

  const handleSubmit = async () => {
    try {
      if (!isEdit) {
        const shopeeLink = form.getFieldValue("shopeeLink");
        if (!shopeeLink) {
          setCreateStep(0);
          message.warning("Bước 1: Nhập Shopee link trước khi thêm sản phẩm");
          return;
        }

        if (!syncedFromShopee || shopeeLink !== lastSyncedLink) {
          setCreateStep(0);
          message.warning("Bước 1: Cần đồng bộ Shopee link trước khi lưu");
          return;
        }
      }

      const values = await form.validateFields();
      setSaving(true);

      const payload = {
        name: values.name,
        brand: values.brand,
        variants: Array.isArray(values.variants) ? values.variants : [],
        shop_id: values.shop_id,
        priceMin: Number(values.priceMin),
        priceMax: Number(values.priceMax),
        price: (Number(values.priceMin) + Number(values.priceMax)) / 2,
        original_price: Number(values.priceOriginal || 0),
        rating: Number(values.rating || 0),
        sold: Number(values.sold || 0),
        image: values.image,
        external_link: values.external_link || values.shopeeLink,
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
    <div className='space-y-4 relative'>
      <div className='flex sticky top-0 z-1000 backdrop-blur-3xl left-0 right-0 items-center justify-between gap-2'>
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
          onClick={isLinkStep ? handleContinueToDetailStep : handleSubmit}>
          {isEdit ?
            "Lưu cập nhật"
          : isLinkStep ?
            "Tiếp tục"
          : "Lưu sản phẩm"}
        </Button>
      </div>

      <Card className='bg-gray-800 border-gray-700'>
        <Form layout='vertical' form={form}>
          {!isEdit && (
            <>
              <Steps
                size='small'
                current={createStep}
                className='mb-4'
                items={[
                  {
                    title: "Bước 1",
                    description: "Nhập và đồng bộ Shopee link",
                  },
                  {
                    title: "Bước 2",
                    description: "Điền thông tin và lưu sản phẩm",
                  },
                ]}
              />

              {isLinkStep && (
                <div className='rounded border flex flex-col gap-2  border-blue-900/60 bg-blue-950/20 p-4 mb-4'>
                  <Alert
                    type='info'
                    showIcon
                    className='mb-4'
                    message='Bước 1: Nhập và đồng bộ Shopee link trước khi thêm sản phẩm'
                  />

                  <Row
                    gutter={12}
                    className='flex justify-between items-center'>
                    <Col span={18}>
                      <Form.Item
                        label='Link Shopee'
                        name='shopeeLink'
                        rules={[
                          { required: true, message: "Nhập link Shopee" },
                        ]}>
                        <Input
                          placeholder='https://shopee.vn/...'
                          onChange={(e) => {
                            const nextValue = e.target.value;
                            if (nextValue !== lastSyncedLink) {
                              setSyncedFromShopee(false);
                            }
                          }}
                        />
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
                </div>
              )}

              {isDetailStep && (
                <Alert
                  type='success'
                  showIcon
                  className='mb-4'
                  message='Bước 2: Hoàn tất thông tin sản phẩm và lưu'
                  description={
                    lastSyncedLink ?
                      `Đã đồng bộ từ link: ${lastSyncedLink}`
                    : undefined
                  }
                />
              )}
            </>
          )}

          {isDetailStep && (
            <>
              {!isEdit && (
                <div className='mb-4'>
                  <Button
                    onClick={() => setCreateStep(0)}
                    type='default'
                    className='border-gray-600 text-gray-200'>
                    Quay lại Bước 1
                  </Button>
                </div>
              )}

              <Row gutter={12} className='flex flex-wrap gap-2'>
                <Col span={12}>
                  <Form.Item
                    label='Tên sản phẩm'
                    name='name'
                    rules={[{ required: true, message: "Nhập tên sản phẩm" }]}>
                    <Input disabled={createLocked} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <div className='flex items-center gap-2'>
                        <span>Shop</span>
                        <QuickCreateShopPopover
                          disabled={createLocked}
                          onCreated={async (shop) => {
                            await fetchShops();
                            if (shop?.id) {
                              form.setFieldValue("shop_id", shop.id);
                            }
                          }}
                        />
                      </div>
                    }
                    name='shop_id'
                    rules={[{ required: true, message: "Chọn shop" }]}>
                    <Select
                      disabled={createLocked}
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
                    <InputNumber
                      className='w-full'
                      min={0}
                      disabled={createLocked}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label='Giá max'
                    name='priceMax'
                    rules={[{ required: true, message: "Nhập giá max" }]}>
                    <InputNumber
                      className='w-full'
                      min={0}
                      disabled={createLocked}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Giá niêm yết' name='priceOriginal'>
                    <InputNumber
                      className='w-full'
                      min={0}
                      disabled={createLocked}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={8}>
                  <Form.Item
                    label={
                      <div className='flex items-center gap-2'>
                        <span>Thương hiệu</span>
                        <QuickCreateBrandPopover
                          disabled={createLocked}
                          onCreated={async (brand) => {
                            await fetchBrands();
                            if (brand?.name) {
                              form.setFieldValue("brand", brand.name);
                            }
                          }}
                        />
                      </div>
                    }
                    name='brand'>
                    <Select
                      disabled={createLocked}
                      showSearch
                      allowClear
                      loading={brandLoading}
                      placeholder='Chọn thương hiệu'
                      options={brands.map((brand) => ({
                        value: brand.name,
                        label: brand.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Variants' name='variants'>
                    <Select
                      mode='tags'
                      disabled={createLocked}
                      allowClear
                      placeholder='Nhập nhiều variants'
                      tokenSeparators={[",", "\n"]}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Rating' name='rating'>
                    <InputNumber
                      className='w-full'
                      min={0}
                      max={5}
                      step={0.1}
                      disabled={createLocked}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label='Đã bán' name='sold'>
                    <InputNumber
                      className='w-full'
                      min={0}
                      disabled={createLocked}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label='Thumbnail URL' name='image'>
                <Input disabled={createLocked} />
              </Form.Item>
              <Form.Item label='External link' name='external_link'>
                <Input disabled={createLocked} />
              </Form.Item>
              <Form.Item label='External ID' name='external_id'>
                <Input disabled={createLocked} />
              </Form.Item>
              <Form.Item label='Mô tả' name='description'>
                <Input.TextArea rows={3} disabled={createLocked} />
              </Form.Item>
            </>
          )}
        </Form>
      </Card>
    </div>
  );
}
