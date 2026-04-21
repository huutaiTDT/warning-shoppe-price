/** @format */

import Pagination from "@/components/pagination";
import { brandsAPI, masterProductsAPI } from "@/services/api";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import {
  AlertCircle,
  Download,
  Edit,
  Plus,
  Trash2,
  Upload as UploadIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

interface Product {
  id: string;
  name: string;
  brand_id: string | null;
  models: string[];
  variants: string[];
  listed_price: number;
  is_active: boolean;
  is_warning?: boolean;
  created_at: string;
  warnings?: Array<{
    shop_product_id: string;
    shop_product_name: string;
    price_min: number;
    price: number;
    price_max: number;
    listed_price: number;
    shopInfo?: {
      name: string;
      url?: string;
    };
  }>;
}

interface Brand {
  id: string;
  name: string;
  code?: string;
}

export default function MasterProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Cache for warnings: { productId: warnings[] }
  const [warningsCache, setWarningsCache] = useState<
    Record<string, Product["warnings"]>
  >({});
  const [loadingWarnings, setLoadingWarnings] = useState<Set<string>>(
    new Set(),
  );

  const [search, setSearch] = useState("");
  const [filterBrand, setFilterBrand] = useState<string | null>(null);
  const [filterModels, setFilterModels] = useState<string[]>([]);
  const [filterVariants, setFilterVariants] = useState<string[]>([]);

  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [form] = Form.useForm();

  // Modal chi tiết cảnh báo
  const [warningDetailModal, setWarningDetailModal] = useState(false);
  const [selectedWarningDetail, setSelectedWarningDetail] = useState<any>(null);

  // ================= FETCH =================
  const fetchData = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      const res = await masterProductsAPI.list(page, limit, {
        brand_id: filterBrand,
        models: filterModels,
        variants: filterVariants,
        search: search,
      });

      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      message.error("Không tải được sản phẩm");
    } finally {
      setLoading(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await brandsAPI.list(1, 1000);
      setBrands(
        (res.data?.brands || res.data?.items || []).filter(
          (b: any) => b?.id && typeof b.id === "string",
        ),
      );
    } catch {
      message.error("Không tải được danh sách brand");
    }
  };

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    fetchData(pagination.page, pagination.pageSize);
  }, [search, pagination, filterBrand, filterModels, filterVariants]);

  // ================= CRUD =================
  const openCreate = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      brand_id: null,
      models: [],
      variants: [],
      listed_price: 0,
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEdit = (item: Product) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingItem?.id) {
        await masterProductsAPI.update(editingItem.id, values);
        message.success("Cập nhật sản phẩm thành công");
      } else {
        await masterProductsAPI.create(values);
        message.success("Tạo sản phẩm thành công");
      }

      setIsModalOpen(false);
      fetchData(pagination.page, pagination.pageSize);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrDeactivate = async (id: string, isActive: boolean) => {
    try {
      await masterProductsAPI.update(id, { is_active: !isActive });
      message.success(isActive ? "Vô hiệu hóa" : "Kích hoạt");
      fetchData(pagination.page, pagination.pageSize);
    } catch {
      message.error("Không thể cập nhật");
    }
  };

  const handleExport = async () => {
    try {
      const res = await masterProductsAPI.export();
      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "san-pham.xlsx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      message.error("Export thất bại");
    }
  };

  // Fetch warnings with caching
  const fetchWarnings = async (productId: string) => {
    // Return from cache if exists
    if (warningsCache[productId]) {
      return warningsCache[productId];
    }

    // Avoid multiple simultaneous requests
    if (loadingWarnings.has(productId)) {
      return;
    }

    setLoadingWarnings((prev) => new Set([...prev, productId]));
    try {
      const res = await masterProductsAPI.getWarning(productId);
      const warnings = res.data.warnings || [];
      setWarningsCache((prev) => ({
        ...prev,
        [productId]: warnings,
      }));
      return warnings;
    } catch (error) {
      console.error("Error fetching warnings:", error);
      return [];
    } finally {
      setLoadingWarnings((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // ================= TABLE =================
  const columns = [
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      render: (text: string, record: Product) => (
        <div>
          <div className='font-medium'>{text}</div>
          {record.is_active ?
            <Tag color='green'>Active</Tag>
          : <Tag color='red'>Inactive</Tag>}
        </div>
      ),
    },
    {
      title: "Brand",
      dataIndex: "brand_id",
      render: (id: string) => {
        const b = brands.find((x) => x.id === id);
        return b ? <Tag color='blue'>{b.name}</Tag> : "-";
      },
    },
    {
      title: "Models",
      dataIndex: "models",
      render: (v: string[]) =>
        v?.length ? v.map((i) => <Tag key={i}>{i}</Tag>) : "-",
    },
    {
      title: "Variants",
      dataIndex: "variants",
      render: (v: string[]) =>
        v?.length ? v.map((i) => <Tag key={i}>{i}</Tag>) : "-",
    },
    {
      title: "Giá",
      dataIndex: "listed_price",
      render: (v: number) => `₫${v?.toLocaleString()}`,
    },
    {
      title: "Cảnh báo",
      key: "warnings",
      render: (_: any, record: Product) => {
        const isWarning = record.is_warning || false;
        if (!isWarning) {
          return <span>-</span>;
        }

        const warnings = warningsCache[record.id] || [];
        const isLoading = loadingWarnings.has(record.id);

        const content = (
          <div className='w-full'>
            {isLoading ?
              <div className='text-sm text-gray-500'>Đang tải...</div>
            : warnings.length > 0 ?
              <>
                <div className='mb-3 pb-2 border-b'>
                  <div className='text-sm font-semibold text-red-600'>
                    {warnings.length} sản phẩm có giá thấp hơn ₫
                    {record.listed_price?.toLocaleString()}
                  </div>
                  <div className='text-xs text-gray-500 mt-1'>
                    Các cửa hàng đang bán dưới giá niêm yết
                  </div>
                </div>
                <div className='space-y-2 max-h-96 overflow-y-auto text-sm'>
                  {warnings.map((w) => (
                    <div
                      key={w.shop_product_id}
                      style={{
                        padding: 10,
                      }}
                      className=' bg-[#111827] hover:bg-[#111829]/90 border border-gray-700 rounded-xl p-4'
                      onClick={() => {
                        setSelectedWarningDetail({
                          ...w,
                          productName: record.name,
                        });
                        setWarningDetailModal(true);
                      }}>
                      <div className='font-medium'>{w.shop_product_name}</div>
                      <div className='text-xs text-gray-600 mt-1'>
                        Giá: ₫{w.price_min?.toLocaleString()} - ₫
                        {w.price_max?.toLocaleString()}
                      </div>
                      <div className='text-xs text-red-600 font-semibold mt-1'>
                        Chênh lệch: -₫
                        {(w.listed_price - w.price_min)?.toLocaleString()}
                      </div>
                      {w.shopInfo && (
                        <div className='text-xs text-blue-600 mt-2 font-medium'>
                          🏪 {w.shopInfo.name}
                          {w.shopInfo.url && (
                            <a
                              href={w.shopInfo.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='ml-1 underline'>
                              Xem
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            : <div className='text-sm text-gray-500'>Không có cảnh báo</div>}
          </div>
        );

        return (
          <Popover
            content={content}
            title='Chi tiết cảnh báo giá'
            trigger='hover'
            placement='left'
            onOpenChange={(open) => {
              if (open && !warningsCache[record.id]) {
                fetchWarnings(record.id);
              }
            }}>
            <div className='inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition cursor-pointer'>
              <AlertCircle size={16} />
              <span className='text-sm font-semibold'>{warnings.length}</span>
            </div>
          </Popover>
        );
      },
    },
    {
      title: "Thao tác",
      render: (_: any, r: Product) => (
        <Space>
          <Button icon={<Edit size={14} />} onClick={() => openEdit(r)} />
          <Popconfirm
            title='Xác nhận?'
            onConfirm={() => handleDeleteOrDeactivate(r.id, r.is_active)}>
            <Button icon={<Trash2 size={14} />} danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className='space-y-4 flex flex-col h-full'>
      {/* FILTER */}
      <Space wrap>
        <Input
          placeholder='Tìm sản phẩm...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select
          placeholder='Brand'
          allowClear
          style={{ width: 160 }}
          value={filterBrand}
          onChange={setFilterBrand}
          options={brands.map((b) => ({ label: b.name, value: b.id }))}
        />

        <Select
          style={{ width: 160 }}
          mode='tags'
          placeholder='Models'
          onChange={setFilterModels}
        />
        <Select
          style={{ width: 160 }}
          mode='tags'
          placeholder='Variants'
          onChange={setFilterVariants}
        />

        <Button
          onClick={() => {
            setSearch("");
            setFilterBrand(null);
            setFilterModels([]);
            setFilterVariants([]);
          }}>
          Làm mới
        </Button>

        <Button type='primary' icon={<Plus />} onClick={openCreate}>
          Thêm
        </Button>

        <Upload
          showUploadList={false}
          customRequest={async ({ file }) => {
            await masterProductsAPI.import(file as File);
            message.success("Import ok");
            fetchData();
          }}>
          <Button icon={<UploadIcon />}>Import</Button>
        </Upload>

        <Button icon={<Download />} onClick={handleExport}>
          Export
        </Button>
      </Space>

      {/* TABLE */}
      <Table
        columns={columns}
        dataSource={items}
        rowKey='id'
        loading={loading}
        pagination={false}
      />

      <Pagination
        currentCount={pagination.page}
        pageSize={pagination.pageSize}
        total={total}
        onChange={(page) => {
          setPagination({ page, pageSize: pagination.pageSize });
        }}
        page={
          pagination.page > Math.ceil(total / pagination.pageSize) ?
            1
          : pagination.page
        }
      />

      {/* MODAL */}
      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={handleSave}
        confirmLoading={saving}
        title='Sản phẩm'>
        <Form form={form} layout='vertical'>
          <Form.Item name='name' label='Tên' rules={[{ required: true }]}>
            <Input />
          </Form.Item>

          <Form.Item name='brand_id' label='Brand'>
            <Select
              allowClear
              options={brands.map((b) => ({
                label: b.name,
                value: b.id,
              }))}
            />
          </Form.Item>

          <Form.Item name='models' label='Models'>
            <Select mode='tags' />
          </Form.Item>

          <Form.Item name='variants' label='Variants'>
            <Select mode='tags' />
          </Form.Item>

          <Form.Item
            style={{
              width: "100%",
            }}
            name='listed_price'
            label='Giá'>
            <InputNumber className='w-full' />
          </Form.Item>

          <Form.Item name='is_active' valuePropName='checked'>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* MODAL CHI TIẾT CẢNH BÁO */}
      <Modal
        open={warningDetailModal}
        onCancel={() => setWarningDetailModal(false)}
        footer={null}
        width={640}
        title={<span className='text-gray-100'>Chi tiết cảnh báo giá</span>}>
        {selectedWarningDetail &&
          (() => {
            const listed = selectedWarningDetail.listed_price || 0;
            const min = selectedWarningDetail.price_min || 0;
            const max = selectedWarningDetail.price_max || 0;

            const diff = listed - min;
            const percent = listed > 0 ? (diff / listed) * 100 : 0;

            return (
              <div className='flex flex-col gap-4 space-y-4 p-4 text-gray-200'>
                {/* MASTER PRODUCT */}
                <div
                  style={{
                    padding: 10,
                  }}
                  className=' bg-[#111827] border border-gray-700 rounded-xl p-4'>
                  <div className='text-xs text-gray-400 uppercase tracking-wide'>
                    📦 Sản phẩm gốc
                  </div>

                  <div className='mt-2 text-base font-semibold text-white'>
                    {selectedWarningDetail.productName || "-"}
                  </div>

                  <div className='mt-2 text-sm text-gray-400'>Giá niêm yết</div>

                  <div className='text-lg font-bold text-blue-400'>
                    ₫{listed.toLocaleString()}
                  </div>
                </div>

                {/* WARNING PRODUCT */}
                <div
                  style={{
                    padding: 10,
                  }}
                  className='bg-[#1f2937] border border-red-500/40 rounded-xl p-4'>
                  <div className='flex items-center justify-between'>
                    <div className='text-xs text-red-400 uppercase tracking-wide'>
                      ⚠️ Giá thấp hơn thị trường
                    </div>

                    {/* Badge % */}
                    {diff > 0 && (
                      <div className='text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded'>
                        -{percent.toFixed(1)}%
                      </div>
                    )}
                  </div>

                  <div className='mt-2 text-base font-semibold text-white'>
                    {selectedWarningDetail.shop_product_name || "-"}
                  </div>

                  <div className='mt-3 text-sm text-gray-400'>Khoảng giá</div>

                  <div className='text-lg font-bold text-red-400'>
                    ₫{min.toLocaleString()} - ₫{max.toLocaleString()}
                  </div>

                  <div className='mt-2 text-sm'>
                    <span className='text-gray-400'>Chênh lệch: </span>
                    <span className='text-red-400 font-semibold'>
                      -₫{diff.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* SHOP INFO */}
                {selectedWarningDetail.shopInfo && (
                  <div
                    style={{
                      padding: 10,
                    }}
                    className='bg-[#111827] border border-gray-700 rounded-xl p-4'>
                    <div className='text-xs text-gray-400 uppercase tracking-wide'>
                      🏪 Cửa hàng
                    </div>

                    <div className='mt-2 text-base font-semibold text-white'>
                      {selectedWarningDetail.shopInfo.name || "-"}
                    </div>

                    {selectedWarningDetail.shopInfo.url && (
                      <a
                        href={selectedWarningDetail.shopInfo.url}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-block mt-3 text-sm text-blue-400 hover:text-blue-300 transition'>
                        Xem cửa hàng →
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
      </Modal>
    </div>
  );
}
