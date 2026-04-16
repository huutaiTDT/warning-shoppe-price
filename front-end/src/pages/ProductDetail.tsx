/** @format */

import { normalizeProduct } from "@/lib/product";
import { formatPrice, formatPriceRange } from "@/lib/utils";
import { productsAPI } from "@/services/api";
import {
  Alert,
  Button,
  Card,
  Col,
  Image,
  Row,
  Space,
  Spin,
  Tag,
  message,
} from "antd";
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any | null>(null);

  const fetchProduct = async (productId: string) => {
    setLoading(true);
    try {
      const res = await productsAPI.get(productId);
      setProduct(normalizeProduct(res.data || {}));
    } catch (error) {
      message.error("Không tải được chi tiết sản phẩm");
      navigate("/dashboard/products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const trendNode = () => {
    if (!product?.priceOriginal || product.priceOriginal <= 0) {
      return <Tag>Chưa có giá niêm yết</Tag>;
    }

    if (product.priceTrend === "down") {
      return (
        <Tag icon={<TrendingDown size={12} />} color='green'>
          Đang giảm
        </Tag>
      );
    }

    if (product.priceTrend === "up") {
      return (
        <Tag icon={<TrendingUp size={12} />} color='red'>
          Cao hơn niêm yết
        </Tag>
      );
    }

    return <Tag color='default'>Ổn định</Tag>;
  };

  if (loading) {
    return (
      <div className='h-full flex items-center justify-center'>
        <Spin size='large' />
      </div>
    );
  }

  if (!product) {
    return null;
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
            Chi tiết sản phẩm
          </h2>
        </Space>

        <Button
          type='primary'
          icon={<Edit size={14} />}
          onClick={() => navigate(`/dashboard/products/${product.id}/edit`)}>
          Chỉnh sửa
        </Button>
      </div>

      <Card className='bg-gray-800 border-gray-700'>
        <Space direction='vertical' size={14} className='w-full'>
          {product.thumbnail ?
            <Image
              src={product.thumbnail}
              alt={product.name}
              height={260}
              width='100%'
              className='rounded-md object-cover'
              fallback='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
            />
          : <div className='w-full h-45 rounded-md bg-gray-700 flex items-center justify-center text-sm text-gray-300'>
              Không có ảnh
            </div>
          }

          {product.isOverOriginal && (
            <Alert
              type='error'
              showIcon
              icon={<AlertTriangle size={14} />}
              message='Cảnh báo: Giá hiện tại đang cao hơn giá niêm yết'
              description='Nên xem lại mức giá để tránh giảm khả năng chuyển đổi.'
            />
          )}

          <Row gutter={[12, 12]}>
            <Col span={12}>
              <div className='text-xs text-gray-400'>Tên sản phẩm</div>
              <div className='text-sm font-semibold'>{product.name}</div>
            </Col>
            <Col span={12}>
              <div className='text-xs text-gray-400'>Thương hiệu</div>
              <div className='text-sm'>{product.brand || "Không rõ"}</div>
            </Col>
            <Col span={12}>
              <div className='text-xs text-gray-400'>Shop</div>
              <div className='text-sm'>{product.shopName || "Không rõ"}</div>
            </Col>
            <Col span={12}>
              <div className='text-xs text-gray-400'>Rating</div>
              <div className='text-sm'>★ {product.rating?.toFixed(1) || 0}</div>
            </Col>
            <Col span={12}>
              <div className='text-xs text-gray-400'>Giá Shopee</div>
              <div className='text-sm text-emerald-500 font-semibold'>
                {formatPriceRange(product.priceMin, product.priceMax)}
              </div>
            </Col>
            <Col span={12}>
              <div className='text-xs text-gray-400'>Giá niêm yết</div>
              <div className='text-sm'>
                {product.priceOriginal > 0 ?
                  formatPrice(product.priceOriginal)
                : "Chưa có"}
              </div>
            </Col>
            <Col span={24}>
              <div className='text-xs text-gray-400'>Xu hướng</div>
              <div className='mt-1'>{trendNode()}</div>
            </Col>
            {product.description && (
              <Col span={24}>
                <div className='text-xs text-gray-400'>Mô tả</div>
                <div className='text-sm'>{product.description}</div>
              </Col>
            )}
          </Row>
        </Space>
      </Card>
    </div>
  );
}
