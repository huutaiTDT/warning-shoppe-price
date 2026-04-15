/**
 * Utility to extract Shopee product information from link
 *
 * @format
 */

export interface ShopeeProductInfo {
  id: string;
  name: string;
  price: number;
  priceMin: number;
  priceMax: number;
  image?: string;
  thumbnail?: string;
  gallery?: string[];
  rating?: number;
  sold?: number;
  brand?: string;
  description?: string;
  aff_link: string;
}

/**
 * Fetch product information from external API
 */
export async function fetchShopeeProductInfo(
  url: string,
): Promise<ShopeeProductInfo | { error: string }> {
  try {
    if (!url.trim()) {
      return { error: "Vui lòng nhập URL hợp lệ" };
    }

    // URL-encode the Shopee link
    const encodedUrl = encodeURIComponent(url);

    // Call external API
    const res = await fetch(
      `https://tool-api.gitlabserver.id.vn/common/products/${encodedUrl}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!res.ok) {
      return { error: "Không thể lấy thông tin sản phẩm từ API" };
    }

    const data = await res.json();

    if (!data.product) {
      return { error: "Không tìm thấy sản phẩm" };
    }

    const product = data.product;

    return {
      id: product.id || "",
      name: product.name || "",
      price: product.price || 0,
      priceMin: product.priceMin || 0,
      priceMax: product.priceMax || 0,
      image: product.image || "",
      thumbnail: product.thumbnail || product.image || "",
      gallery: product.gallery || [],
      rating: product.rating || 0,
      sold: product.sold || 0,
      brand: product.brand || product.brand_name || "",
      description: product.description || "",
      aff_link: product.url || url,
    };
  } catch (error) {
    console.error("Error fetching Shopee product info:", error);
    return { error: "Lỗi kết nối đến API" };
  }
}

/**
 * Check if product already exists by external_id
 */
export async function checkProductExists(externalId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/products?external_id=${encodeURIComponent(externalId)}`,
    );
    const data = await res.json();
    return (data.products && data.products.length > 0) || false;
  } catch (error) {
    console.error("Error checking product existence:", error);
    return false;
  }
}
