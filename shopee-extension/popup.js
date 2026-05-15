/**
 * Popup Script - Main UI logic for Shopee Product Exporter
 * Self-contained version without ES6 modules
 * @format
 */

// ============================================================================
// Initialize - Wait for XLSX to load
// ============================================================================

function waitForXLSXLibrary(maxRetries = 30) {
  return new Promise((resolve) => {
    // Direct check first
    if (window.XLSX) {
      console.log("✅ XLSX library already loaded");
      return resolve(true);
    }

    // Check if all CDNs failed
    if (window.XLSX_FAILED) {
      console.error("❌ All XLSX CDNs failed to load");
      return resolve(false);
    }

    let attempts = 0;
    const checkInterval = setInterval(() => {
      console.log(
        `Checking XLSX... Attempt ${attempts + 1}/${maxRetries} - Loaded: ${!!window.XLSX}`,
      );

      if (window.XLSX) {
        clearInterval(checkInterval);
        console.log(
          "✅ XLSX library loaded successfully after " + attempts + " attempts",
        );
        resolve(true);
      } else if (window.XLSX_FAILED) {
        clearInterval(checkInterval);
        console.error("❌ All XLSX CDNs failed");
        resolve(false);
      } else if (attempts >= maxRetries) {
        clearInterval(checkInterval);
        console.error(
          "❌ XLSX library failed to load after " + maxRetries * 200 + "ms",
        );
        resolve(false);
      }
      attempts++;
    }, 200); // Check every 200ms
  });
}

// Initialize XLSX check when content loads
window.addEventListener("DOMContentLoaded", async () => {
  console.log("🔄 Popup HTML loaded, waiting for XLSX library...");
  await delay(500); // Slight delay to ensure scripts loaded
  const xlsxLoaded = await waitForXLSXLibrary(30);

  if (xlsxLoaded) {
    console.log("✅ XLSX ready - export can proceed");
  } else {
    console.warn("⚠️ XLSX failed to load from all CDNs");
  }
});

// Also check if document is already loaded (fallback for cached popups)
if (document.readyState === "complete") {
  console.log("📄 Document already fully loaded, checking XLSX");
  waitForXLSXLibrary(30);
}

const CONFIG = {
  SHOPEE_URL: "shopee.vn",
};

const SELECTORS = {
  PRODUCT_ITEM: ".shop-search-result-view__item",
  PRODUCT_ITEM_FALLBACK: "[role='group'][aria-label*='Product card']",
};

const REGEX = {
  PRICE: /^\d+[.,]\d{3}/,
  DISCOUNT: /-(\d+)%/,
  RATING: /^[4-5]\.\d$/,
  SOLD: /(\d+[kKmM]\+?|\d+)/,
};

// ============================================================================
// State
// ============================================================================

let products = [];
let isLoading = false;

// ============================================================================
// DOM Elements
// ============================================================================

const loadHTMLBtn = document.getElementById("loadHTML");
const loadMultiPageBtn = document.getElementById("loadMultiPage");
const maxPagesToLoadInput = document.getElementById("maxPagesToLoad");
const exportBtn = document.getElementById("export");
const resultDiv = document.getElementById("result");
const previewDiv = document.getElementById("preview");
const loadingDiv = document.getElementById("loading");
const viewCacheBtn = document.getElementById("viewCache");
const cacheModal = document.getElementById("cacheModal");
const closeModalBtn = document.getElementById("closeModal");
const closeModalBtn2 = document.getElementById("closeModalBtn");
const cacheShopsContainer = document.getElementById("cacheShopsContainer");
const clearAllCacheBtn = document.getElementById("clearAllCache");

// ============================================================================
// Event Listeners
// ============================================================================

loadHTMLBtn?.addEventListener("click", handleLoadFromHTML);
loadMultiPageBtn?.addEventListener("click", handleLoadMultiPage);
exportBtn?.addEventListener("click", handleExport);
viewCacheBtn?.addEventListener("click", handleViewCache);
closeModalBtn?.addEventListener("click", () =>
  cacheModal.classList.add("hidden"),
);
closeModalBtn2?.addEventListener("click", () =>
  cacheModal.classList.add("hidden"),
);
clearAllCacheBtn?.addEventListener("click", handleClearAllCache);

// Close modal when clicking outside
cacheModal?.addEventListener("click", (e) => {
  if (e.target === cacheModal) {
    cacheModal.classList.add("hidden");
  }
});

// ============================================================================
// Button Handlers
// ============================================================================

async function handleLoadFromHTML() {
  if (isLoading) return;

  try {
    const tab = await getActiveTab();
    if (!tab.url.includes(CONFIG.SHOPEE_URL)) {
      showError("❌ Vui lòng truy cập shopee.vn");
      return;
    }

    setLoading(true);
    resultDiv.innerHTML = "";

    const shopName = extractShopName(tab.url);
    const currentPage = extractPageNumber(tab.url);
    const htmlContent = await getHTMLFromContent(tab.id, tab.url);
    products = parseProductsFromHTML(htmlContent);

    const currentPage = extractPageNumber(products);
    const totalPage = extractTotalPagesFromHTML(products);

    if (products.length > 0) {
      // Lưu vào cache với page riêng biệt
      await saveProductsToCache(shopName, products, currentPage);

      showSuccess(
        `✅ Đã lấy thành công <strong>${products.length}</strong> sản phẩm từ trang ${currentPage}<br><small>💾 Đã lưu cache</small>`,
      );
      exportBtn.disabled = false;
      showPreview(products.slice(0, 5));
    } else {
      showError("❌ Không tìm thấy sản phẩm. Kiểm tra trang web Shopee");
      exportBtn.disabled = true;
    }
  } catch (error) {
    console.error("Error:", error);
    showError(`❌ Lỗi: ${error.message}`);
    exportBtn.disabled = true;
  } finally {
    setLoading(false);
  }
}

async function handleLoadMultiPage() {
  if (isLoading) return;

  try {
    const tab = await getActiveTab();
    if (!tab.url.includes(CONFIG.SHOPEE_URL)) {
      showError("❌ Vui lòng truy cập shopee.vn");
      return;
    }

    setLoading(true);
    resultDiv.innerHTML = "";
    products = [];

    // Extract shop name từ URL
    const shopName = extractShopName(tab.url);

    // Check if any pages cached for this shop
    const allCacheData = await getAllCachedData();
    const shopCache = allCacheData[shopName];

    if (shopCache && shopCache.totalCount > 0) {
      const pageList = Object.keys(shopCache.pages).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );
      const useCache = confirm(
        `📦 Tìm thấy ${shopCache.totalCount} sản phẩm từ ${pageList.length} trang trong cache:\n${pageList.map((p) => `Page ${p} (${shopCache.pages[p].count} items)`).join(", ")}\n\nDùng cache này?`,
      );
      if (useCache) {
        // Load all cached pages
        for (const page of pageList) {
          const pageProducts = await getCachedProducts(
            shopName,
            parseInt(page),
          );
          products.push(...pageProducts);
        }

        showSuccess(
          `✅ Đã load từ cache: <strong>${products.length}</strong> sản phẩm từ ${pageList.length} trang`,
        );
        exportBtn.disabled = false;
        showPreview(products.slice(0, 5));
        setLoading(false);
        return;
      }
    }

    // Step 1: Get first page to detect total pages
    resultDiv.innerHTML = `⏳ Đang kiểm tra tổng số trang...`;

    const firstPageUrl = updatePageInUrl(tab.url, 0); // Start from page 0
    console.log(`Getting first page: ${firstPageUrl}`);

    const firstTab = await createHiddenTab(firstPageUrl);
    await delay(2000);

    const firstPageHTML = await extractProductsFromNewTab(firstTab.id);
    await chrome.tabs.remove(firstTab.id);

    // Detect total pages from HTML
    const totalPages = detectTotalPages(firstPageHTML);
    console.log(`Total pages detected: ${totalPages}`);

    if (totalPages <= 0) {
      showError("❌ Không thể phát hiện tổng số trang. Thử load bình thường?");
      setLoading(false);
      return;
    }

    resultDiv.innerHTML = `📊 Phát hiện: <strong>${totalPages}</strong> trang | 🔄 Đang tải...`;

    // Step 2: Check user input for max pages to load
    let pagesToLoad = totalPages;
    const userInput = parseInt(maxPagesToLoadInput?.value || "0", 10);
    if (userInput > 0 && userInput < totalPages) {
      pagesToLoad = userInput;
      resultDiv.innerHTML = `📊 Phát hiện: <strong>${totalPages}</strong> trang | 📋 Mở ${pagesToLoad} trang theo chỉ định | 🔄 Đang tải...`;
    }

    // Step 3: Load trang tuần tự - thay đổi URL trên tab hiện tại
    resultDiv.innerHTML = `🔄 Bắt đầu lấy ${pagesToLoad} trang... | ⏳ Chờ xử lý`;

    let allProducts = [];
    let successPages = 0;
    let failedPages = 0;

    // Lấy activeTab (tab đang mở)
    const activeTab = tab;
    const originalUrl = activeTab.url; // Lưu URL gốc

    console.log(`Starting sequential page loading: ${pagesToLoad} pages`);

    // Vòng lặp: thay đổi URL → chờ load → lấy dữ liệu
    for (let page = 0; page < pagesToLoad; page++) {
      try {
        const pageUrl = updatePageInUrl(originalUrl, page);
        console.log(
          `[Page ${page}/${pagesToLoad - 1}] Updating URL to: ${pageUrl}`,
        );

        // Cập nhật URL của tab hiện tại
        await chrome.tabs.update(activeTab.id, { url: pageUrl });

        // Chờ trang load xong (content.js sẽ chờ DOM ready)
        resultDiv.innerHTML = `⏳ Trang ${page + 1}/${pagesToLoad}... (${allProducts.length} sản phẩm) - Chờ load...`;
        await delay(5000); // Chờ trang load xong

        // Lấy HTML từ tab (waitForElement trong content.js sẽ chờ DOM ready)
        console.log(`[Page ${page}] Extracting HTML...`);
        resultDiv.innerHTML = `⏳ Trang ${page + 1}/${pagesToLoad}... (${allProducts.length} sản phẩm) - Lấy dữ liệu...`;

        const htmlContent = await extractProductsFromNewTab(activeTab.id);
        const pageProducts = parseProductsFromHTML(htmlContent);

        if (pageProducts.length > 0) {
          await saveProductsToCache(shopName, pageProducts, page);
          allProducts.push(...pageProducts);
          successPages++;
          console.log(`✅ Page ${page}: ${pageProducts.length} products`);
        } else {
          failedPages++;
          console.warn(`⚠️ Page ${page}: Không tìm thấy sản phẩm`);
        }

        // Delay nhỏ giữa các trang để tránh bị ban
        if (page < pagesToLoad - 1) {
          await delay(1000);
        }
      } catch (err) {
        failedPages++;
        console.error(`❌ Lỗi page ${page}:`, err);
        resultDiv.innerHTML = `❌ Lỗi page ${page + 1}: ${err.message}`;
        await delay(1000);
      }
    }

    // Restore URL ban đầu
    console.log(`Restoring original URL...`);
    await chrome.tabs.update(activeTab.id, { url: originalUrl });

    products = allProducts;

    if (products.length > 0) {
      showSuccess(
        `✅ Cào thành công <strong>${products.length}</strong> sản phẩm từ ${pagesToLoad} trang<br>` +
          `<small>✅ ${successPages}/${pagesToLoad} trang | 💾 Đã lưu cache</small>`,
      );
      exportBtn.disabled = false;
      showPreview(products.slice(0, 5));
    } else {
      showError(
        `❌ Không lấy được sản phẩm từ ${pagesToLoad} trang (${failedPages} lỗi)`,
      );
      exportBtn.disabled = true;
    }
  } catch (error) {
    console.error("Error:", error);
    showError(`❌ Lỗi: ${error.message}`);
    exportBtn.disabled = true;
  } finally {
    setLoading(false);
  }
}

function handleExport() {
  if (products.length === 0) {
    alert("Vui lòng lấy sản phẩm trước");
    return;
  }

  try {
    setLoading(true);
    resultDiv.innerHTML = "⏳ Đang chuẩn bị xuất file...";

    // Check if XLSX is loaded and ready
    if (!window.XLSX && !window.XLSX_FAILED) {
      // XLSX might be loading, wait a bit more
      resultDiv.innerHTML = "⏳ Thư viện Excel đang load... Đợi giây chút...";
      console.log("XLSX loading, retrying...");

      let retryCount = 0;
      const maxRetries = 5;

      const retryExport = () => {
        setTimeout(() => {
          if (window.XLSX) {
            console.log("✅ XLSX loaded, proceeding with export");
            try {
              const filename = exportToExcel(products);
              showSuccess(
                `✅ Xuất file thành công: <strong>${filename}</strong>`,
              );
              setLoading(false);
            } catch (error) {
              console.error("Export error:", error);
              showError(`❌ Lỗi xuất file: ${error.message}`);
              setLoading(false);
            }
          } else if (window.XLSX_FAILED || retryCount >= maxRetries) {
            // CDN failed or too many retries, offer CSV fallback
            console.warn("XLSX failed, offering CSV fallback");
            showCSVFallback(products, "Xuất thành công (CSV)");
            setLoading(false);
          } else {
            retryCount++;
            resultDiv.innerHTML = `⏳ Đợi thư viện Excel... (${maxRetries - retryCount + 1} lần thử)`;
            retryExport();
          }
        }, 1000);
      };

      retryExport();
      return;
    }

    if (window.XLSX) {
      // XLSX ready, export as Excel
      const filename = exportToExcel(products);
      showSuccess(`✅ Xuất Excel thành công: <strong>${filename}</strong>`);
      setLoading(false);
    } else if (window.XLSX_FAILED) {
      // All CDNs failed, offer CSV fallback
      console.warn("All XLSX CDNs failed, using CSV fallback");
      showCSVFallback(
        products,
        "Xuất thành công (CSV - vì Excel không tải được)",
      );
      setLoading(false);
    }
  } catch (error) {
    console.error("Export error:", error);
    showError(`❌ Lỗi xuất file: ${error.message}`);
    setLoading(false);
  }
}

/**
 * Export products as CSV file when XLSX fails
 */
function showCSVFallback(productsData, message) {
  try {
    // Create CSV content
    const headers = Object.keys(productsData[0]);
    const csvContent = [
      headers.join(","),
      ...productsData.map((product) =>
        headers
          .map((header) => {
            const value = product[header];
            // Escape quotes and wrap in quotes if contains comma/quote/newline
            if (
              typeof value === "string" &&
              (value.includes(",") ||
                value.includes("\n") ||
                value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const filename = `shopee-products-${new Date().getTime()}.csv`;

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess(
      `✅ ${message}<br><small>File: <strong>${filename}</strong><br>` +
        `💡 Gợi ý: Mở trong Excel và Save as .xlsx</small>`,
    );
    console.log(`✅ CSV exported: ${filename}`);
  } catch (error) {
    console.error("CSV export error:", error);
    showError(
      `❌ Lỗi xuất file CSV: ${error.message}<br><br>` +
        `Thông tin chi tiết: ${JSON.stringify(error)}`,
    );
  }
}

// ============================================================================
// Cache Management Handlers
// ============================================================================

async function handleViewCache() {
  cacheModal.classList.remove("hidden");
  cacheShopsContainer.innerHTML =
    '<p class="loading-text">⏳ Đang tải cache...</p>';

  try {
    const allCache = await getAllCachedData();

    if (Object.keys(allCache).length === 0) {
      cacheShopsContainer.innerHTML =
        '<p class="loading-text">📭 Không có cache nào</p>';
      return;
    }

    cacheShopsContainer.innerHTML = "";

    Object.entries(allCache).forEach(([shopName, shopData]) => {
      const shopItem = document.createElement("div");
      shopItem.className = "shop-cache-item";

      const header = document.createElement("div");
      header.className = "shop-cache-header";

      const title = document.createElement("div");
      title.className = "shop-cache-title";
      title.innerHTML = `🏪 ${shopName}`;

      const count = document.createElement("div");
      count.className = "shop-cache-count";
      count.textContent = `${shopData.totalCount} sản phẩm`;

      header.appendChild(title);
      header.appendChild(count);

      const pagesList = document.createElement("div");
      pagesList.className = "pages-list";

      const pages = Object.keys(shopData.pages).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );
      pages.forEach((pageNum) => {
        const pageData = shopData.pages[pageNum];
        const pageItem = document.createElement("div");
        pageItem.className = "page-item";

        const pageInfo = document.createElement("div");
        pageInfo.className = "page-info";

        const pageNum_el = document.createElement("div");
        pageNum_el.className = "page-number";
        pageNum_el.textContent = `Page ${pageNum}`;

        const pageCount = document.createElement("div");
        pageCount.className = "page-count";
        pageCount.textContent = `${pageData.count} products`;

        const pageTime = document.createElement("div");
        pageTime.className = "page-time";
        const timestamp = new Date(pageData.timestamp);
        pageTime.textContent = timestamp.toLocaleString("vi-VN");

        pageInfo.appendChild(pageNum_el);
        pageInfo.appendChild(pageCount);
        pageInfo.appendChild(pageTime);

        const previewBtn = document.createElement("button");
        previewBtn.className = "preview-button";
        previewBtn.textContent = "👁️";
        previewBtn.title = "Preview products from this page";
        previewBtn.onclick = () => {
          showCachePreview(shopName, pageNum, pageData);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-page-btn";
        deleteBtn.textContent = "🗑️";
        deleteBtn.title = "Delete this page cache";
        deleteBtn.onclick = async () => {
          if (confirm(`Delete cache for page ${pageNum}?`)) {
            await deleteCacheByShopAndPage(shopName, parseInt(pageNum));
            await handleViewCache(); // Reload cache view
          }
        };

        pageItem.appendChild(pageInfo);
        pageItem.appendChild(previewBtn);
        pageItem.appendChild(deleteBtn);

        pagesList.appendChild(pageItem);
      });

      shopItem.appendChild(header);
      shopItem.appendChild(pagesList);
      cacheShopsContainer.appendChild(shopItem);
    });
  } catch (error) {
    console.error("Error loading cache:", error);
    cacheShopsContainer.innerHTML = `<p class="loading-text">❌ Lỗi: ${error.message}</p>`;
  }
}

function showCachePreview(shopName, pageNum, pageData) {
  // Create a simple alert showing preview of products
  const preview = pageData.products.slice(0, 5);
  let previewText = `📋 Preview - ${shopName} Page ${pageNum}\n\n`;
  preview.forEach((product, idx) => {
    previewText += `${idx + 1}. ${product["Tên sản phẩm"]}\n`;
    previewText += `   Giá: ${product.Giá} | Đánh giá: ${product["Đánh giá"]}\n\n`;
  });
  if (pageData.products.length > 5) {
    previewText += `... và ${pageData.products.length - 5} sản phẩm khác`;
  }
  alert(previewText);
}

async function handleClearAllCache() {
  if (
    !confirm(
      "⚠️ Bạn chắc chắn muốn xóa TẤT CẢ cache?\nHành động này không thể hoàn tác!",
    )
  ) {
    return;
  }

  const deletedCount = await clearAllCacheInStorage();
  alert(`✅ Đã xóa ${deletedCount} cache entries`);
  await handleViewCache(); // Reload cache view
}

// ============================================================================
// Product Parsing Functions
// ============================================================================

function parseProductsFromHTML(htmlContent) {
  const results = [];

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    let items = doc.querySelectorAll(SELECTORS.PRODUCT_ITEM);
    if (items.length === 0) {
      items = doc.querySelectorAll(SELECTORS.PRODUCT_ITEM_FALLBACK);
    }

    console.log(`Found ${items.length} products in HTML`);

    items.forEach((item, idx) => {
      try {
        const product = extractProductFromElement(item, idx);
        if (product && product["Tên sản phẩm"]) {
          results.push(product);
        }
      } catch (err) {
        console.warn(`Error parsing product ${idx}:`, err);
      }
    });
  } catch (err) {
    console.error("Parse HTML error:", err);
    throw err;
  }

  return results;
}

function extractProductFromElement(item, index) {
  return {
    ID: index + 1,
    "Tên sản phẩm": extractName(item),
    "Product ID": extractProductId(item),
    URL: extractProductUrl(item),
    Giá: formatPrice(extractPrice(item)),
    "Chiết khấu": extractDiscount(item),
    "Đánh giá": extractRating(item),
    "Đã bán": extractSoldCount(item),
    "Trạng thái": "Hoạt động",
  };
}

function extractName(item) {
  const ariaLabel = item.querySelector("[aria-label*='Product card']");
  if (ariaLabel) {
    const label = ariaLabel.getAttribute("aria-label") || "";
    return label.replace("Product card: ", "").trim();
  }

  const titleEl = item.querySelector(".whitespace-normal.line-clamp-2");
  return titleEl?.textContent?.trim() || "";
}

function extractProductId(item) {
  // Tìm link sản phẩm có itemid hoặc product id trong href
  const link =
    item.querySelector("a[href*='itemid']") ||
    item.querySelector("a[href*='-i.'") ||
    item.querySelector("a[href*='/detail/']");

  if (link) {
    const href = link.getAttribute("href") || "";
    // Shopee format: https://shopee.vn/...itemid=123456 hoặc https://shopee.vn/.../123456
    const itemidMatch = href.match(/itemid[=:]([\d]+)/);
    if (itemidMatch) return itemidMatch[1];

    // Alternative format: /i.123456
    const altMatch = href.match(/\/(\d+)(?:\?|$)/);
    if (altMatch) return altMatch[1];
  }
  return "N/A";
}

function extractProductUrl(item) {
  const link =
    item.querySelector("a[href*='itemid']") ||
    item.querySelector("a[href*='-i.'") ||
    item.querySelector("a");

  if (link) {
    let href = link.getAttribute("href") || "";
    // Ensure absolute URL
    if (href.startsWith("/")) {
      href = "https://shopee.vn" + href;
    } else if (!href.startsWith("http")) {
      href = "https://shopee.vn/" + href;
    }
    return href;
  }
  return "N/A";
}

function extractPrice(item) {
  const spans = item.querySelectorAll("span");
  for (let span of spans) {
    const text = span.textContent?.trim() || "";
    if (REGEX.PRICE.test(text)) {
      const num = parsePrice(text);
      if (num > 0) return num;
    }
  }
  return 0;
}

function parsePrice(text) {
  const numStr = text.replace(/[.,]/g, "");
  return parseInt(numStr, 10) || 0;
}

function formatPrice(price) {
  if (price <= 0) return "0 đ";
  return Math.floor(price / 1000) + "k đ";
}

function extractDiscount(item) {
  const spans = item.querySelectorAll("span");
  for (let span of spans) {
    const text = span.textContent?.trim() || "";
    const match = text.match(REGEX.DISCOUNT);
    if (match) return `${match[1]}%`;
  }
  return "0%";
}

function extractRating(item) {
  const spans = item.querySelectorAll("span");
  for (let span of spans) {
    const text = span.textContent?.trim() || "";
    if (REGEX.RATING.test(text)) {
      return parseFloat(text);
    }
  }
  return 4.5;
}

function extractSoldCount(item) {
  const elements = item.querySelectorAll("*");
  for (let elem of elements) {
    const text = elem.textContent?.trim() || "";
    if (text.includes("Đã bán")) {
      const match = text.match(REGEX.SOLD);
      if (match) return match[1];
    }
  }
  return "0";
}

// ============================================================================
// Export Functions
// ============================================================================

async function waitForXLSX(timeout = 5000) {
  const startTime = Date.now();
  while (!window.XLSX && Date.now() - startTime < timeout) {
    await delay(100);
  }
  if (!window.XLSX) {
    throw new Error("XLSX library failed to load");
  }
}

function exportToExcel(productsData) {
  if (!window.XLSX) {
    throw new Error("XLSX library not loaded");
  }

  const worksheet = XLSX.utils.json_to_sheet(productsData);

  worksheet["!cols"] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 15 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sản phẩm");

  const filename = `shopee-products-${new Date().getTime()}.xlsx`;
  XLSX.writeFile(workbook, filename);

  return filename;
}

// ============================================================================
// UI Display Functions
// ============================================================================

function showError(message) {
  resultDiv.innerHTML = `<span class="error">${message}</span>`;
}

function showSuccess(message) {
  resultDiv.innerHTML = message;
}

function showPreview(items) {
  if (!items || items.length === 0) {
    previewDiv.innerHTML = "<p>Không có sản phẩm</p>";
    return;
  }

  let html = '<table class="preview-table"><thead><tr>';

  Object.keys(items[0]).forEach((key) => {
    html += `<th>${key}</th>`;
  });
  html += "</tr></thead><tbody>";

  items.forEach((product) => {
    html += "<tr>";
    Object.values(product).forEach((value) => {
      html += `<td>${value}</td>`;
    });
    html += "</tr>";
  });

  html += "</tbody></table>";
  previewDiv.innerHTML = html;
}

function setLoading(loading) {
  isLoading = loading;
  loadingDiv.classList.toggle("hidden", !loading);
  loadHTMLBtn.disabled = loading;
}

// ============================================================================
// Chrome Communication Functions
// ============================================================================

function getActiveTab() {
  return chrome.tabs
    .query({ active: true, currentWindow: true })
    .then((tabs) => tabs[0]);
}

function extractPageNumber(products) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(products, "text/html");
    const el = doc.querySelector(".shopee-mini-page-controller__current");
    if (el) {
      const txt = el.textContent?.trim();
      const num = txt && txt.match(/(\d+)/);
      if (num) return parseInt(num[1]);
    }
  } catch (e) {
    // ignore and fallthrough
  }

  return 1;
}
function extractTotalPagesFromHTML(products) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(products, "text/html");
    const el = doc.querySelector(".shopee-mini-page-controller__total");
    if (el) {
      const txt = el.textContent?.trim();
      const num = txt && txt.match(/(\d+)/);
      if (num) return parseInt(num[1]);
    }
  } catch (e) {
    // ignore and fallthrough
  }

  return 1;
}

function extractShopName(url) {
  // Extract shop name từ URL: https://shopee.vn/delitools_hcm?page=1
  const match = url.match(/shopee\.vn\/([^/?]+)/);
  return match ? match[1] : "shopee";
}

/**
 * Detect total pages from Shopee HTML
 * Looks for pagination info in the page
 */
function detectTotalPages(htmlContent) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // Method 1: Look for pagination button with last page number
    // Shopee usually has: <button>1</button> <button>2</button> ... <button>50</button>
    const paginationButtons = doc.querySelectorAll(
      'button[class*="pagination"], button[class*="page"], a[class*="pagination"], a[class*="page"]',
    );

    let maxPage = 0;
    paginationButtons.forEach((btn) => {
      const text = btn.textContent?.trim();
      if (text && /^\d+$/.test(text)) {
        const pageNum = parseInt(text, 10);
        if (pageNum > maxPage) {
          maxPage = pageNum;
        }
      }
    });

    if (maxPage > 0) {
      console.log(
        `✅ Detected total pages: ${maxPage} (from pagination buttons)`,
      );
      return maxPage;
    }

    // Method 2: Look for "showing X to Y" text
    const allText = doc.body.textContent;
    const showingMatch = allText.match(
      /showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)/i,
    );
    if (showingMatch) {
      const totalItems = parseInt(showingMatch[3], 10);
      const itemsPerPage = 60; // Shopee typically shows 60 items per page
      const totalPagesCalc = Math.ceil(totalItems / itemsPerPage);
      console.log(
        `✅ Detected total pages: ${totalPagesCalc} (from item count: ${totalItems} items)`,
      );
      return totalPagesCalc;
    }

    // Method 3: Check for "next page" button - if it exists, there's at least 2 pages
    // If no next button on page 0, assume only 1 page
    const hasNextButton = doc.querySelector(
      'button[class*="next"], a[class*="next"], [aria-label*="next"]',
    );

    if (!hasNextButton) {
      console.log(`ℹ️ No next button found, assuming 1 page only`);
      return 1;
    }

    // Method 4: Fallback - try to find any pagination indicator
    const paginationText = doc.body.textContent.match(
      /page\s+(\d+)\s+of\s+(\d+)/i,
    );
    if (paginationText) {
      const totalPages = parseInt(paginationText[2], 10);
      console.log(
        `✅ Detected total pages: ${totalPages} (from "page X of Y")`,
      );
      return totalPages;
    }

    console.warn(`⚠️ Cannot detect total pages, defaulting to 5 pages`);
    return 5; // Safe default
  } catch (error) {
    console.error("Error detecting total pages:", error);
    return 5; // Safe default on error
  }
}

function updatePageInUrl(url, page) {
  const urlObj = new URL(url);
  urlObj.searchParams.set("page", page);
  return urlObj.toString();
}

function getHTMLFromContent(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { action: "getProductsHTML" },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response || response.error) {
          reject(new Error(response?.error || "❌ Lỗi kết nối"));
        } else {
          resolve(response.html);
        }
      },
    );
  });
}

function getHTMLFromContentByUrl(tabId, url) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { action: "getFeedFromUrl", url: url },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response || response.error) {
          reject(new Error(response?.error || "❌ Lỗi kết nối"));
        } else {
          resolve(response.html);
        }
      },
    );
  });
}

// ============================================================================
// Tab Management Functions
// ============================================================================

function createHiddenTab(url) {
  return chrome.tabs.create({
    url: url,
    active: false,
  });
}

function extractProductsFromNewTab(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(
      tabId,
      { action: "getProductsHTML" },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!response || response.error) {
          reject(new Error(response?.error || "❌ Lỗi lấy HTML từ tab"));
        } else {
          resolve(response.html);
        }
      },
    );
  });
}

// ============================================================================
// Cache Management Functions
// ============================================================================

/**
 * Get cached products by shop and page
 * Cache key format: cache_SHOPNAME_page_PAGENUMBER
 */
function getCachedProducts(shopName, page = 1) {
  return new Promise((resolve) => {
    const cacheKey = `cache_${shopName}_page_${page}`;
    chrome.storage.local.get(cacheKey, (result) => {
      if (result[cacheKey]) {
        resolve(result[cacheKey].products || []);
      } else {
        resolve([]);
      }
    });
  });
}

/**
 * Get all cached data organized by shop
 * Returns: {shop1: {pages: {1: {...}, 2: {...}}, totalCount}, shop2: {...}}
 */
function getAllCachedData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      const cacheData = {};

      Object.keys(result).forEach((key) => {
        if (key.startsWith("cache_")) {
          // Parse key: cache_SHOPNAME_page_PAGENUMBER
          const match = key.match(/^cache_(.+)_page_(\d+)$/);
          if (match) {
            const shopName = match[1];
            const pageNum = parseInt(match[2], 10);
            const cacheEntry = result[key];

            if (!cacheData[shopName]) {
              cacheData[shopName] = {
                pages: {},
                totalCount: 0,
              };
            }

            if (cacheEntry.products) {
              cacheData[shopName].pages[pageNum] = {
                count: cacheEntry.products.length,
                timestamp: cacheEntry.timestamp,
                products: cacheEntry.products,
              };
              cacheData[shopName].totalCount += cacheEntry.products.length;
            }
          }
        }
      });

      resolve(cacheData);
    });
  });
}

/**
 * Save products to cache with shop and page
 * Cache key format: cache_SHOPNAME_page_PAGENUMBER
 */
function saveProductsToCache(shopName, products, page = 1) {
  return new Promise((resolve) => {
    const cacheKey = `cache_${shopName}_page_${page}`;
    const cacheData = {
      products: products,
      timestamp: new Date().toISOString(),
      count: products.length,
    };
    chrome.storage.local.set({ [cacheKey]: cacheData }, () => {
      console.log(
        `✅ Saved ${products.length} products to cache for ${shopName} page ${page}`,
      );
      resolve();
    });
  });
}

/**
 * Delete cache for specific shop and page
 */
function deleteCacheByShopAndPage(shopName, page) {
  return new Promise((resolve) => {
    const cacheKey = `cache_${shopName}_page_${page}`;
    chrome.storage.local.remove(cacheKey, () => {
      console.log(`🗑️ Deleted cache for ${shopName} page ${page}`);
      resolve();
    });
  });
}

/**
 * Clear all cache
 */
function clearAllCacheInStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (result) => {
      const keys = Object.keys(result).filter((key) =>
        key.startsWith("cache_"),
      );
      if (keys.length > 0) {
        chrome.storage.local.remove(keys, () => {
          console.log(`🗑️ Deleted ${keys.length} cache entries`);
          resolve(keys.length);
        });
      } else {
        resolve(0);
      }
    });
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
