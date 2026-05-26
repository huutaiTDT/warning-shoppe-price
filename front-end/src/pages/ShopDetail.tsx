/** @format */

import Pagination from "@/components/pagination";
import { formatPrice } from "@/lib/utils";
import { brandsAPI, productsAPI, shopsAPI } from "@/services/api";
import {
  Button,
  Input,
  message,
  Modal,
  Progress,
  Select,
  Spin,
  Table,
  Tag,
} from "antd";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Edit,
  History,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import Papa from "papaparse";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";

interface Shop {
  id: string;
  name: string;
  url: string;
  platform: string;
  code?: string;
  created_at?: string;
}

interface Product {
  id: string;
  name: string;
  price_min: number;
  price_max: number;
  original_price: number;
  brand?: string;
  created_at?: string;
}

interface PriceHistory {
  id?: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  crawledAt?: any;
}

export default function ShopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [total, setTotal] = useState(0);
  const [searchName, setSearchName] = useState("");
  const [searchBrand, setSearchBrand] = useState<string | undefined>();
  const [brandOptions, setBrandOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [filterLoading, setFilterLoading] = useState(false);

  // Price History state
  const [priceHistoryModal, setPriceHistoryModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
  const [priceHistoryLoading, setPriceHistoryLoading] = useState(false);

  // Import Excel state
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  }>({ success: 0, failed: 0, errors: [] });

  // Collapse state
  const [isShopInfoCollapsed, setIsShopInfoCollapsed] = useState(true);

  const fetchShopDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await shopsAPI.get(id);
      setShop(res.data);
    } catch (error) {
      message.error("Lỗi tải thông tin cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    if (!id) return;
    try {
      setFilterLoading(true);
      const res = await brandsAPI.selectBox();
      setBrandOptions(res.data || []);
    } catch (error) {
      console.error("Lỗi tải tùy chọn lọc:", error);
    } finally {
      setFilterLoading(false);
    }
  };

  const fetchShopProducts = async (
    page = 1,
    limit = 10,
    name = "",
    brand = "",
  ) => {
    if (!id) return;
    try {
      setProductsLoading(true);
      const res = await shopsAPI.getProducts(id, page, limit, name, brand);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
      setPagination({ page, pageSize: limit });
    } catch (error) {
      message.error("Lỗi tải sản phẩm");
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchPriceHistory = async (productId: string) => {
    setPriceHistoryLoading(true);
    try {
      const res = await productsAPI.getPriceHistory(productId, 100);
      setPriceHistory(res.data.items || res.data || []);
    } catch (error) {
      message.error("Lỗi tải lịch sử giá");
      setPriceHistory([]);
    } finally {
      setPriceHistoryLoading(false);
    }
  };

  // Parse Excel/CSV file
  const parseExcelFile = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = e.target?.result;

          if (file.name.endsWith(".csv")) {
            // Parse CSV
            Papa.parse(data as string, {
              header: true,
              dynamicTyping: false,
              skipEmptyLines: true,
              complete: (results) => {
                resolve(results.data || []);
              },
              error: (error: any) => {
                reject(new Error(`CSV Parse Error: ${error.message}`));
              },
            });
          } else {
            // Parse Excel
            const workbook = XLSX.read(data, { type: "binary" });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet);
            resolve(rows || []);
          }
        } catch (error: any) {
          reject(error);
        }
      };

      if (file.name.endsWith(".csv")) {
        reader.readAsText(file);
      } else {
        reader.readAsBinaryString(file);
      }
    });
  };

  // Transform row data to product object
  const transformRowToProduct = (row: any) => {
    const productName =
      row["Tên sản phẩm"] ||
      row["tenSanPham"] ||
      row["Product Name"] ||
      row["name"];
    const productUrl = row["URL"] || row["url"];
    const productId = row["Product ID"] || row["productId"] || row["id"];

    // Validate required fields
    if (!productName?.toString().trim() || !productUrl?.toString().trim()) {
      throw new Error("Thiếu tên sản phẩm hoặc URL");
    }

    return {
      name: productName.toString().trim(),
      url: productUrl.toString().trim(),
      product_id: productId ? productId.toString().trim() : undefined,
      brand: row["Brand"]?.toString().trim() || undefined,
      price: row["Giá"]?.toString().replace(/[^\d]/g, "") || undefined,
      discount:
        row["Chiết khấu"]?.toString().replace(/[^\d]/g, "") || undefined,
      rating: row["Đánh giá"] ? parseFloat(row["Đánh giá"]) : undefined,
      sold: row["Đã bán"]?.toString().replace(/[^\d]/g, "") || undefined,
      status: row["Trạng thái"]?.toString().trim() || "active",
      shop_id: id,
    };
  };

  // Validate and import products
  const handleImportProducts = async () => {
    if (!importFile || !id) {
      message.error("Vui lòng chọn file để import");
      return;
    }

    setImportLoading(true);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });

    try {
      const rows = await parseExcelFile(importFile);

      if (!rows?.length) {
        message.error("File không có dữ liệu");
        setImportLoading(false);
        return;
      }

      const errors: string[] = [];
      const validProducts: any = [];

      // Validate and transform rows
      rows.forEach((row: any, index: number) => {
        try {
          const product = transformRowToProduct(row);
          validProducts.push(product);
        } catch (error: any) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
        setImportProgress(Math.round(((index + 1) / rows.length) * 50));
      });

      // Stop if no valid products
      if (validProducts.length === 0) {
        message.error("Không có sản phẩm hợp lệ để nhập");
        setImportResults({ success: 0, failed: rows.length, errors });
        setImportLoading(false);
        return;
      }

      // Import valid products
      await shopsAPI.importProductByExcel(id, validProducts);
      setImportProgress(100);

      // Refresh product list
      await fetchShopProducts(1, pagination.pageSize, searchName, searchBrand);

      const failedCount = errors.length;
      setImportResults({
        success: validProducts.length,
        failed: failedCount,
        errors,
      });

      message.success(`Nhập thành công ${validProducts.length} sản phẩm`);
      if (failedCount > 0) {
        message.warning(`${failedCount} dòng bị bỏ qua do lỗi`);
      }
    } catch (error: any) {
      message.error(`Lỗi: ${error.message}`);
      setImportResults({
        success: 0,
        failed: 0,
        errors: [error.message],
      });
    } finally {
      setImportLoading(false);
    }
  };

  // Handle file change
  const handleImportFileChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = [".csv", ".xlsx", ".xls"];
      const isValid = validTypes.some((type) =>
        file.name.toLowerCase().endsWith(type),
      );

      if (!isValid) {
        message.error("Chỉ hỗ trợ file CSV, XLSX, XLS");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        message.error("File quá lớn (max 10MB)");
        return;
      }

      setImportFile(file);
    }
  };

  const handleViewPriceHistory = async (product: Product) => {
    setSelectedProduct(product);
    setPriceHistoryModal(true);
    await fetchPriceHistory(product.id);
  };

  useEffect(() => {
    fetchShopDetail();
    fetchFilterOptions();
    fetchShopProducts(pagination.page, pagination.pageSize);
  }, [id]);

  const handlePageChange = (newPage: number) => {
    fetchShopProducts(newPage, pagination.pageSize, searchName, searchBrand);
  };

  const handleSearch = () => {
    fetchShopProducts(1, pagination.pageSize, searchName, searchBrand || "");
  };

  const handleClearSearch = () => {
    setSearchName("");
    setSearchBrand(undefined);
    fetchShopProducts(1, pagination.pageSize, "", "");
  };

  const handleBrandChange = (value: string | undefined) => {
    setSearchBrand(value);
  };

  const columns = [
    {
      title: "Ảnh",
      dataIndex: "image",
      key: "image",
      width: 80,
      render: (image: string) => (
        <img
          src={image}
          alt='Product'
          className='w-16 h-16 object-cover rounded'
        />
      ),
    },
    {
      title: "Tên sản phẩm",
      dataIndex: "name",
      key: "name",
      width: 250,
      ellipsis: true,
    },
    {
      title: "Brand",
      dataIndex: "brand",
      key: "brand",
      width: 120,
      render: (brand: string) => brand || "-",
    },
    {
      title: "Giá Min",
      dataIndex: "price_min",
      key: "price_min",
      width: 120,
      align: "right" as const,
      render: (price: number) => formatPrice(price),
    },
    {
      title: "Giá Max",
      dataIndex: "price_max",
      key: "price_max",
      width: 120,
      align: "right" as const,
      render: (price: number) => formatPrice(price),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      render: (_: any, product: Product) => (
        <Button
          type='text'
          icon={<History size={14} />}
          onClick={() => handleViewPriceHistory(product)}
          className='text-blue-400 hover:text-blue-300'
          title='Xem lịch sử giá'>
          Lịch sử giá
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Spin size='large' />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className='flex flex-col items-center justify-center h-full'>
        <p className='text-gray-400 mb-4'>Không tìm thấy cửa hàng</p>
        <Button onClick={() => navigate("/dashboard/shops")}>Quay lại</Button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 10,
      }}
      className='space-y-6 gap-4 flex flex-col h-full pb-6'>
      {/* Header */}
      <div className='flex items-center gap-4'>
        <Button
          type='text'
          icon={<ArrowLeft size={18} />}
          onClick={() => navigate("/dashboard/shops")}
          className='text-gray-400! hover:text-white!'
        />
        <h1 className='text-2xl font-bold'>{shop.name}</h1>
      </div>

      {/* Section 1: Shop Info */}
      <div
        style={{
          padding: 10,
        }}
        className='bg-gray-800 rounded-lg border border-gray-700'>
        <div
          className='flex justify-between items-center p-6 cursor-pointer hover:bg-gray-750 transition-colors'
          onClick={() => setIsShopInfoCollapsed(!isShopInfoCollapsed)}>
          <h2 className='text-lg font-semibold'>Thông tin cửa hàng</h2>
          <ChevronDown
            size={20}
            className={`transition-transform duration-200 ${
              isShopInfoCollapsed ? "-rotate-90" : ""
            }`}
          />
        </div>

        {!isShopInfoCollapsed && (
          <div
            className='grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-700'
            style={{
              padding: 16,
            }}>
            {/* Name */}
            <div>
              <p className='text-sm text-gray-400 mb-1'>Tên cửa hàng</p>
              <p className='text-white font-medium'>{shop.name}</p>
            </div>

            {/* Platform */}
            <div>
              <p className='text-sm text-gray-400 mb-1'>Nền tảng</p>
              <p className='text-white font-medium'>{shop.platform}</p>
            </div>

            {/* Code */}
            <div>
              <p className='text-sm text-gray-400 mb-1'>Mã cửa hàng</p>
              <p className='text-white font-medium'>{shop.code || "-"}</p>
            </div>

            {/* Created Date */}
            <div>
              <p className='text-sm text-gray-400 mb-1'>Tạo lúc</p>
              <p className='text-white font-medium'>
                {shop.created_at ?
                  new Date(shop.created_at).toLocaleDateString("vi-VN")
                : "-"}
              </p>
            </div>

            {/* URL */}
            <div className='md:col-span-2'>
              <p className='text-sm text-gray-400 mb-1'>URL cửa hàng</p>
              <a
                href={shop.url}
                target='_blank'
                rel='noopener noreferrer'
                className='text-emerald-500 hover:text-emerald-400 break-all'>
                {shop.url}
              </a>
            </div>
            {/* Edit Button */}
            <div className='md:col-span-2 flex justify-end pt-2 border-t border-gray-700'>
              <Button
                type='primary'
                icon={<Edit size={14} />}
                onClick={() => navigate(`/dashboard/shops/${id}/edit`)}>
                Chỉnh sửa
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Products */}
      <div
        style={{
          padding: 10,
        }}
        className='flex-1 flex flex-col bg-gray-800 rounded-lg p-6 border border-gray-700 min-h-0'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold'>Sản phẩm ({total})</h2>
          <Button
            type='primary'
            icon={<UploadIcon size={14} />}
            onClick={() => setImportModal(true)}>
            Nhập sản phẩm
          </Button>
        </div>

        {/* Search Filters */}
        <div
          className='mb-4 flex gap-2 flex-wrap bg-black'
          style={{
            padding: 10,
          }}>
          <Input
            placeholder='Nhập tên sản phẩm...'
            value={searchName || ""}
            onChange={(e) => setSearchName(e.target.value)}
            onPressEnter={handleSearch}
            style={{ minWidth: 200, flex: 1 }}
          />
          <Select
            placeholder='Chọn thương hiệu...'
            value={searchBrand}
            onChange={handleBrandChange}
            allowClear
            loading={filterLoading}
            style={{ minWidth: 200, flex: 1 }}
            options={brandOptions}
          />
          <Button type='primary' onClick={handleSearch}>
            Lọc
          </Button>
          {(searchName || searchBrand) && (
            <Button
              type='text'
              icon={<X size={14} />}
              onClick={handleClearSearch}
              className='text-gray-400 hover:text-white!'>
              Xóa bộ lọc
            </Button>
          )}
        </div>
        {/* header */}
        {columns.length > 0 && (
          <div
            className='flex justify-between  items-center bg-gray-700 px-4 py-2 border-b border-gray-600'
            style={{
              minWidth: 1000,
              padding: 10,
            }}>
            {columns.map((col) => (
              <div
                key={col.key}
                style={{
                  width: col?.width,
                }}
                className={`font-medium justify-end items-center flex text-sm text-gray-400 uppercase tracking-wider ${col.width ? `w-[${col.width}px]` : "flex-1"}`}>
                {col.title}
              </div>
            ))}
          </div>
        )}
        <div className='flex-1 overflow-hidden flex flex-col'>
          <div className='flex-1 overflow-auto'>
            <Table
              showHeader={false}
              onRow={(record: Product) => ({
                onClick: () => navigate(`/dashboard/shop-product/${record.id}`),
              })}
              columns={columns}
              dataSource={products}
              loading={productsLoading}
              rowKey='id'
              pagination={false}
              scroll={{ x: 1000, y: "100%" }}
              size='middle'
            />
          </div>

          <div className='mt-4'>
            <Pagination
              currentCount={pagination.page}
              pageSize={pagination.pageSize}
              total={total}
              onChange={handlePageChange}
              page={
                pagination.page > Math.ceil(total / pagination.pageSize) ?
                  1
                : pagination.page
              }
            />
          </div>
        </div>
      </div>

      {/* Import Modal */}
      <Modal
        open={importModal}
        onCancel={() => {
          setImportModal(false);
          setImportFile(null);
          setImportProgress(0);
          setImportResults({ success: 0, failed: 0, errors: [] });
        }}
        title='Nhập sản phẩm từ Excel'
        width={600}
        footer={[
          <Button
            key='cancel'
            onClick={() => {
              setImportModal(false);
              setImportFile(null);
              setImportProgress(0);
              setImportResults({ success: 0, failed: 0, errors: [] });
            }}>
            Đóng
          </Button>,
          <Button
            key='import'
            type='primary'
            loading={importLoading}
            disabled={!importFile || importLoading}
            onClick={handleImportProducts}>
            Nhập
          </Button>,
        ]}>
        <div className='space-y-4'>
          {/* File Upload */}
          <div>
            <label className='block text-sm font-medium mb-2'>
              Chọn file Excel/CSV
            </label>
            <input
              type='file'
              accept='.csv,.xlsx,.xls'
              onChange={handleImportFileChange}
              className='block w-full text-sm text-gray-400
                file:mr-4 file:py-2 file:px-4
                file:rounded file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100'
            />
            {importFile && (
              <p className='text-sm text-gray-400 mt-2'>
                File: <span className='text-white'>{importFile.name}</span>
              </p>
            )}
          </div>

          {/* Progress */}
          {importProgress > 0 && (
            <div>
              <div className='flex justify-between items-center mb-2'>
                <span className='text-sm'>Đang nhập...</span>
                <span className='text-sm font-medium'>{importProgress}%</span>
              </div>
              <Progress
                percent={importProgress}
                status={importLoading ? "active" : "success"}
              />
            </div>
          )}

          {/* Results */}
          {importResults.success > 0 || importResults.failed > 0 ?
            <div className='bg-gray-700/30 border border-gray-600 rounded-lg p-3 space-y-2'>
              {importResults.success > 0 && (
                <div className='text-green-400 text-sm'>
                  ✓ Thành công: {importResults.success} sản phẩm
                </div>
              )}
              {importResults.failed > 0 && (
                <div className='text-red-400 text-sm'>
                  ✗ Thất bại: {importResults.failed} sản phẩm
                </div>
              )}
              {importResults.errors.length > 0 && (
                <div className='mt-3 max-h-40 overflow-y-auto'>
                  <p className='text-xs text-gray-400 mb-2'>Chi tiết lỗi:</p>
                  {importResults.errors.slice(0, 10).map((err, idx) => (
                    <div key={idx} className='text-xs text-red-300 mb-1'>
                      {err}
                    </div>
                  ))}
                  {importResults.errors.length > 10 && (
                    <div className='text-xs text-gray-500'>
                      ... và {importResults.errors.length - 10} lỗi khác
                    </div>
                  )}
                </div>
              )}
            </div>
          : null}

          {/* Instructions */}
          <div className='bg-blue-900/20 border border-blue-800 rounded-lg p-3 text-xs text-gray-300'>
            <p className='font-medium mb-2'>Hướng dẫn định dạng file:</p>
            <ul className='list-disc list-inside space-y-1'>
              <li>Cột bắt buộc: Tên sản phẩm, URL</li>
              <li>
                Cột tùy chọn: Product ID, Brand, Giá, Chiết khấu, Đánh giá, Đã
                bán, Trạng thái
              </li>
              <li>File size tối đa: 10MB</li>
              <li>Format hỗ trợ: CSV, XLSX, XLS</li>
            </ul>
          </div>
        </div>
      </Modal>

      {/* Price History Modal */}
      <Modal
        open={priceHistoryModal}
        onCancel={() => {
          setPriceHistoryModal(false);
          setSelectedProduct(null);
          setPriceHistory([]);
        }}
        footer={null}
        width={700}
        title={
          <div className='flex items-center gap-2'>
            <History size={18} />
            <span>Lịch sử giá - {selectedProduct?.name}</span>
          </div>
        }>
        {priceHistoryLoading ?
          <div className='flex justify-center py-8'>
            <Spin />
          </div>
        : priceHistory.length > 0 ?
          <div className='space-y-3'>
            {/* Timeline */}
            <div
              style={{
                padding: 10,
              }}
              className='bg-gray-800/40 border border-gray-700/50 rounded-lg p-4 max-h-96 overflow-y-auto'>
              <div className='space-y-2'>
                {priceHistory.map((record, index) => {
                  const isLatest = index === 0;

                  return (
                    <div
                      style={{
                        padding: 10,
                      }}
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isLatest ?
                          "bg-blue-500/10 border-blue-500/20"
                        : "bg-gray-700/20 border-gray-700/30 hover:bg-gray-700/40"
                      }`}>
                      {/* Timeline marker */}
                      <div className='mt-1'>
                        {isLatest ?
                          <div className='w-3 h-3 rounded-full bg-blue-400 ring-2 ring-blue-400/30' />
                        : <div className='w-2 h-2 rounded-full bg-gray-500' />}
                      </div>

                      {/* Content */}
                      <div className='flex-1'>
                        <div className='flex items-center justify-between mb-1'>
                          {isLatest && (
                            <Tag color='blue' className='text-xs'>
                              Mới nhất
                            </Tag>
                          )}
                        </div>
                        <div className='flex items-center gap-1 text-xs text-gray-400'>
                          <Calendar size={12} />
                          {new Date(record.crawledAt).toLocaleString?.("vi-VN")}
                        </div>
                        {record.priceMin && record.priceMax && (
                          <div className='text-xs text-gray-500 mt-1'>
                            Range: {formatPrice(record.priceMin)} -
                            {formatPrice(record.priceMax)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary */}
            <div
              style={{
                padding: 10,
              }}
              className='bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center text-sm'>
              <div className='text-gray-300'>
                Theo dõi từ{" "}
                <span className='font-semibold text-amber-400'>
                  {priceHistory.length}
                </span>{" "}
                lần ghi nhận
              </div>
            </div>
          </div>
        : <div className='text-center py-8 text-gray-400'>
            Không có lịch sử giá
          </div>
        }
      </Modal>
    </div>
  );
}
