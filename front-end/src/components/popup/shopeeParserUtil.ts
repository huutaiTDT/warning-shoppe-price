/** @format */

/**
 * Utility để parse sản phẩm từ HTML Shopee
 * Hỗ trợ extract thông tin sản phẩm từ cấu trúc HTML của Shopee Mall
 */

export interface ShopeeProduct {
  id: string;
  name: string;
  price: number;
  discount: number;
  rating: number;
  sold: string;
  image: string;
}

/**
 * Parse HTML container chứa danh sách sản phẩm
 * @param htmlContent - HTML string từ Shopee
 * @returns Mảng các sản phẩm
 */
export function parseShopeeProducts(htmlContent: string): ShopeeProduct[] {
  const products: ShopeeProduct[] = [];

  try {
    // Tạo temporary DOM
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Find all product items - supports both old and new structure
    let productItems = doc.querySelectorAll(".shop-search-result-view__item");
    if (productItems.length === 0) {
      productItems = doc.querySelectorAll(
        "[role='group'][aria-label*='Product card']",
      );
    }

    console.log(`Found ${productItems.length} products`);

    productItems.forEach((item, index) => {
      try {
        // Extract product name from aria-label
        let name = "";
        const ariaLabels = item.querySelectorAll(
          "[aria-label*='Product card']",
        );
        if (ariaLabels.length > 0) {
          const fullLabel = ariaLabels[0].getAttribute("aria-label") || "";
          name = extractProductName(fullLabel);
        }

        if (!name) {
          // Fallback: try to get from title element
          const titleElement = item.querySelector(
            ".whitespace-normal.line-clamp-2",
          );
          name = titleElement?.textContent?.trim() || "";
        }

        // Extract price - find the span with price number (format: 123.456)
        let price = 0;
        const priceSpans = item.querySelectorAll("span");
        for (let span of priceSpans) {
          const text = span.textContent?.trim() || "";
          if (/^\d+[.,]\d{3}/.test(text)) {
            // Format: 123.456 or 123,456
            price = parsePrice(text);
            if (price > 0) break;
          }
        }

        // Extract discount - look for -XX% pattern
        let discount = 0;
        const discountTexts = item.querySelectorAll("span");
        for (let elem of discountTexts) {
          const text = elem.textContent?.trim() || "";
          const match = text.match(/-(\d+)%/);
          if (match) {
            discount = parseInt(match[1]);
            break;
          }
        }

        // Extract rating - find rating number (4.x or 5.x)
        let rating = 4.5;
        const ratingSpans = item.querySelectorAll("span");
        for (let elem of ratingSpans) {
          const text = elem.textContent?.trim() || "";
          if (/^[4-5]\.\d$/.test(text)) {
            rating = parseFloat(text);
            break;
          }
        }

        // Extract sold count - look for "Đã bán" text
        let sold = "0";
        const allElements = item.querySelectorAll("*");
        for (let elem of allElements) {
          const text = elem.textContent?.trim() || "";
          if (text.includes("Đã bán")) {
            const soldMatch = text.match(/(\d+[kKmM]\+?|\d+)/);
            if (soldMatch) {
              sold = soldMatch[1];
              break;
            }
          }
        }

        // Extract image - from img srcset or src
        let image = "";
        const imgElement = item.querySelector(
          "img[alt*='Product card'], img[alt*='product']",
        );
        if (imgElement) {
          const srcset = imgElement.getAttribute("srcset");
          if (srcset) {
            // Extract first URL from srcset
            const match = srcset.match(/https?:\/\/[^'\s]*/);
            image = match ? match[0] : "";
          }
          if (!image) {
            image = imgElement.getAttribute("src") || "";
          }
        }

        if (name && price > 0) {
          products.push({
            id: `${index + 1}`,
            name,
            price,
            discount,
            rating: rating || 4.5,
            sold: sold || "0",
            image,
          });
        }
      } catch (error) {
        console.warn(`Error parsing product item ${index}:`, error);
      }
    });

    console.log(`Successfully parsed ${products.length} products`);
  } catch (error) {
    console.error("Error parsing Shopee HTML:", error);
  }

  return products;
}

/**
 * Extract product name từ aria-label
 */
function extractProductName(ariaLabel: string): string {
  // Remove "Product card: " prefix
  return ariaLabel.replace("Product card: ", "").trim();
}

/**
 * Parse giá từ text - hỗ trợ format 123,456 hoặc 123.456
 */
function parsePrice(priceText: string): number {
  // Remove spaces, then replace . or , with nothing to get the number
  const cleaned = priceText.trim().replace(/\s/g, "");

  // Handle Vietnamese format: 123.456 (with dot as thousand separator)
  // or 123,456 (with comma as thousand separator)
  const match = cleaned.match(/([\d.]+)/);
  if (match) {
    let numStr = match[1];

    // If it has dots, it's Vietnamese format: remove all dots
    if (numStr.includes(".")) {
      numStr = numStr.replace(/\./g, "");
    }
    // If it has commas, remove them
    numStr = numStr.replace(/,/g, "");

    const parsed = parseInt(numStr, 10);
    return parsed > 0 ? parsed : 0;
  }
  return 0;
}

/**
 * Format số kiểu Việt Nam
 */
export function formatVietnamValue(value: number): string {
  return value.toLocaleString("vi-VN");
}

/**
 * Get mock products (tất cả sản phẩm từ trang 1 của Shopee DELI Store)
 */
export function getMockProducts(): ShopeeProduct[] {
  return [
    {
      id: "1",
      name: "Bộ Tuốc Nơ Vít 44 Trong 1 DELI TOOLS - Bộ Tua Vít Sửa Chữa Điện Thoại, Máy Tính Bảng, Máy Ảnh",
      price: 145800,
      discount: 34,
      rating: 4.9,
      sold: "10k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mhzlizq74m4o6a@resize_w320_nl.webp",
    },
    {
      id: "2",
      name: "Thước Cuộn 5 Mét Cao Cấp Chính Hãng DELI",
      price: 51500,
      discount: 35,
      rating: 4.9,
      sold: "10k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-mau1uk2w6v2w37@resize_w320_nl.webp",
    },
    {
      id: "3",
      name: "Máy Khoan Pin DELI Chính Hãng 12V",
      price: 724500,
      discount: 13,
      rating: 4.9,
      sold: "2k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-7ra0g-m7j4tsulucmuf1@resize_w320_nl.webp",
    },
    {
      id: "4",
      name: "Ổ Cắm Điện 3250W-2500W Đa Năng DELI",
      price: 141300,
      discount: 45,
      rating: 5.0,
      sold: "40k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mgoi56lix72l4c@resize_w320_nl.webp",
    },
    {
      id: "5",
      name: "Thước Đo Khoảng Cách DELI Chính Hãng",
      price: 688500,
      discount: 36,
      rating: 4.9,
      sold: "3k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-mbly4nev9zd0a8@resize_w320_nl.webp",
    },
    {
      id: "6",
      name: "Máy Mài Điện Mini Deli 5 Chức Năng",
      price: 378500,
      discount: 53,
      rating: 5.0,
      sold: "522",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-7ras8-mdmw2wxt4dv31a@resize_w320_nl.webp",
    },
    {
      id: "7",
      name: "Bộ Tua Vít Đa Năng 33 Chi Tiết Chính Hãng DELI",
      price: 100500,
      discount: 16,
      rating: 4.9,
      sold: "9k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mh8u7b8lmsqze2@resize_w320_nl.webp",
    },
    {
      id: "8",
      name: "Thước Kẹp Cơ Điện Tử Cao Cấp DELI",
      price: 121500,
      discount: 24,
      rating: 4.9,
      sold: "5k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-820l4-mekwodr06ww68b@resize_w320_nl.webp",
    },
    {
      id: "9",
      name: "Túi Đựng Đồ Nghề Dụng Cụ Deli",
      price: 120700,
      discount: 36,
      rating: 4.9,
      sold: "7k+",
      image:
        "https://down-vn.img.susercontent.com/file/vn-11134207-81ztc-mngymft4dcee7b@resize_w320_nl.webp",
    },
    {
      id: "10",
      name: "Dao Rọc Giấy Deli Cao Cấp SK5",
      price: 14500,
      discount: 19,
      rating: 5.0,
      sold: "20k+",
      image:
        "https://down-vn.img.susercontent.com/file/sg-11134201-7rd4i-lukkg3as3xfz23@resize_w320_nl.webp",
    },
  ];
}
