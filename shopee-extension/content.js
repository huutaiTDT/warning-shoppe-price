/** @format */

/**
 * Content Script - Shopee Exporter
 * Giữ nguyên logic cũ + fix async/page/change URL/export
 */

// ============================================================================
// Utils
// ============================================================================

const SYSTEM_WARNING_PRICE_API_URL =
  "https://warning-price-api.gitlabserver.id.vn/webhook/import-shop-products";

const SYSTEM_WARNING_PRICE_SECRET = "WPR";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Chờ element xuất hiện
function waitForElement(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const timer = setInterval(() => {
      const element = document.querySelector(selector);

      if (element) {
        clearInterval(timer);
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        clearInterval(timer);

        reject(new Error(`Timeout waiting for ${selector}`));
      }
    }, 200);
  });
}

// ============================================================================
// Floating UI
// ============================================================================

function injectFloatingAction() {
  try {
    if (document.getElementById("shopee-extension-floating-btn")) return;

    const style = document.createElement("style");

    style.textContent = `
      #shopee-extension-floating-btn{
        position:fixed;
        left:16px;
        bottom:24px;
        z-index:2147483647;
        width:58px;
        height:58px;
        border-radius:18px;
        background:linear-gradient(135deg,#4f7cff,#6f8fff);
        color:#fff;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:26px;
        cursor:pointer;
        box-shadow:0 12px 30px rgba(79,124,255,.35);
        transition:.25s ease;
      }

      #shopee-extension-floating-btn:hover{
        transform:translateY(-2px);
      }

      #shopee-extension-panel{
        position:fixed;
        left:90px;
        bottom:24px;
        width:420px;
        height:320px;
        z-index:2147483647;
        border-radius:24px;
        overflow:hidden;
        display:none;
        background:rgba(255,255,255,.96);
        backdrop-filter:blur(18px);
        box-shadow:0 24px 60px rgba(0,0,0,.22);
        border:1px solid rgba(255,255,255,.25);
        font-family:Inter,sans-serif;
      }

      .se-header{
        padding:18px 22px;
        background:linear-gradient(135deg,#4f7cff,#6e8fff);
        color:#fff;
        display:flex;
        justify-content:space-between;
        align-items:center;
      }

      .se-title{
        font-size:18px;
        font-weight:700;
      }

      .se-close{
        border:none;
        width:34px;
        height:34px;
        border-radius:12px;
        background:rgba(255,255,255,.18);
        color:#fff;
        cursor:pointer;
        font-size:16px;
      }

      .se-body{
        padding:20px;
      }

      .se-actions{
        display:flex;
        flex-direction:column;
        gap:12px;
      }

      .se-btn{
        border:none;
        border-radius:16px;
        padding:14px;
        cursor:pointer;
        font-size:14px;
        font-weight:700;
        transition:.25s ease;
      }

      .se-btn:hover{
        transform:translateY(-2px);
      }

      .se-primary{
        background:linear-gradient(135deg,#4f7cff,#6e8fff);
        color:#fff;
      }

      .se-secondary{
        background:#f4f7ff;
        color:#315efb;
      }

      .se-success{
        background:linear-gradient(135deg,#16a34a,#22c55e);
        color:#fff;
      }

      .se-result{
        margin-top:18px;
        background:#f8faff;
        border-radius:16px;
        padding:14px;
        max-height:120px;
        overflow:auto;
        font-size:13px;
        line-height:1.6;
      }

      .se-loading{
        display:flex;
        align-items:center;
        gap:10px;
      }

      .se-spinner{
        width:18px;
        height:18px;
        border-radius:999px;
        border:3px solid #dbe7ff;
        border-top-color:#4f7cff;
        animation:spin .8s linear infinite;
      }

      @keyframes spin{
        to{
          transform:rotate(360deg);
        }
      }
    `;

    document.head.appendChild(style);

    // Floating button
    const btn = document.createElement("div");

    btn.id = "shopee-extension-floating-btn";

    btn.innerHTML = "📦";

    // Panel
    const panel = document.createElement("div");

    panel.id = "shopee-extension-panel";

    panel.innerHTML = `
      <div class="se-header">
        <div class="se-title">
          Shopee Exporter
        </div>

        <button class="se-close" id="se-close">
          ✕
        </button>
      </div>

      <div class="se-body">
        <div class="se-actions">
          <button class="se-btn se-primary" id="se-load">
            🚀 Lấy sản phẩm
          </button>

          <button class="se-btn se-secondary" id="se-export" disabled>
            📥 Xuất CSV
          </button>

          <button class="se-btn se-success" id="se-upload" disabled>
            ⬆️ Đẩy dữ liệu sản phẩm vào shop
          </button>
        </div>

        <div class="se-result" id="se-result">
          Chưa có dữ liệu...
        </div>
      </div>
    `;

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    btn.onclick = () => {
      panel.style.display = panel.style.display === "block" ? "none" : "block";
    };

    document.addEventListener("click", (e) => {
      const target = e.target;

      if (
        target.closest("#shopee-extension-panel") ||
        target.closest("#shopee-extension-floating-btn")
      ) {
        return;
      }

      panel.style.display = "none";
    });

    document.getElementById("se-close")?.addEventListener("click", () => {
      panel.style.display = "none";
    });

    setupPanelEvents();

    console.log("✅ Shopee Exporter Injected");
  } catch (err) {
    console.error(err);
  }
}

injectFloatingAction();

// ============================================================================
// Setup Events
// ============================================================================

function setupPanelEvents() {
  const loadBtn = document.getElementById("se-load");

  const exportBtn = document.getElementById("se-export");

  const uploadBtn = document.getElementById("se-upload");

  const resultDiv = document.getElementById("se-result");

  let cachedProducts = [];

  uploadBtn?.addEventListener("click", async () => {
    if (!cachedProducts.length) return;

    try {
      resultDiv.innerHTML = `
          <div class="se-loading">
            <div class="se-spinner"></div>
            <div>Đang đẩy dữ liệu lên shop...</div>
          </div>
        `;

      const shopUrl = normalizeShopUrl(window.location.href);
      const payload = {
        shopUrl,
        products: cachedProducts.map(normalizeProductForWarningPrice),
      };

      const response = await fetch(SYSTEM_WARNING_PRICE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": SYSTEM_WARNING_PRICE_SECRET,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();

      if (!response.ok) {
        throw new Error(responseText || `HTTP ${response.status}`);
      }

      resultDiv.innerHTML = `✅ Đã đẩy <b>${payload.products.length}</b> sản phẩm lên shop`;
    } catch (err) {
      resultDiv.innerHTML = `❌ ${err.message}`;
    }
  });

  loadBtn?.addEventListener("click", async () => {
    try {
      resultDiv.innerHTML = `
          <div class="se-loading">
            <div class="se-spinner"></div>
            <div>Đang lấy dữ liệu...</div>
          </div>
        `;

      const products = await extractProductsFromPage();

      cachedProducts = products;

      if (products.length > 0) {
        resultDiv.innerHTML = `
            ✅ Đã lấy <b>${products.length}</b> sản phẩm
          `;

        exportBtn.disabled = false;
        uploadBtn.disabled = false;
      } else {
        resultDiv.innerHTML = "❌ Không có sản phẩm";
        exportBtn.disabled = true;
        uploadBtn.disabled = true;
      }
    } catch (err) {
      resultDiv.innerHTML = `❌ ${err.message}`;
      exportBtn.disabled = true;
      uploadBtn.disabled = true;
    }
  });

  exportBtn?.addEventListener("click", () => {
    downloadCSV(cachedProducts);
  });
}

// ============================================================================
// Product Extract
// ============================================================================

async function extractProductsFromPage() {
  const sourceUrl = new URL(window.location.href);
  const crawlerWindow = window.open(sourceUrl.toString(), "_blank");

  if (!crawlerWindow) {
    throw new Error("Popup blocked");
  }

  try {
    await waitWindowLoaded(crawlerWindow, sourceUrl);

    const totalPages = getTotalPagesFromWindow(crawlerWindow);

    console.log(`📄 Total Pages: ${totalPages}`);
    alert(`Tổng số trang: ${totalPages}\n\nNhấn OK để bắt đầu lấy dữ liệu...`);

    const allProducts = [];
    let pageIndex = 0;

    while (true) {
      console.log(`➡️ Page ${pageIndex}`);

      const container = crawlerWindow.document.querySelector(
        ".shop-search-result-view",
      );

      if (!container) {
        console.warn(`❌ No container on page ${pageIndex}`);
        break;
      }

      const products = parseProductsFromHTML(container.innerHTML);

      console.log(`✅ Page ${pageIndex}: ${products.length} products`);

      allProducts.push(...products);

      const previousSignature = getProductsSignature(crawlerWindow);
      const previousPageLabel = getCurrentPageLabel(crawlerWindow);
      const nextClicked = await clickNextPage(crawlerWindow);

      if (!nextClicked) {
        break;
      }

      await waitProductsRendered(
        crawlerWindow,
        previousSignature,
        previousPageLabel,
      );
      await sleep(1500);

      pageIndex++;

      if (pageIndex >= totalPages) {
        break;
      }
    }

    return allProducts;
  } finally {
    crawlerWindow.close();
  }
}

// ============================================================================
// SPA Window Navigation
// ============================================================================

function waitWindowLoaded(win, expectedUrl) {
  return new Promise((resolve) => {
    const check = () => {
      try {
        const currentUrl = new URL(win.location.href);

        if (
          currentUrl.origin === expectedUrl.origin &&
          currentUrl.pathname === expectedUrl.pathname &&
          win.document.readyState === "complete"
        ) {
          resolve();
          return;
        }
      } catch (err) {
        // Keep polling until the new window becomes accessible.
      }

      setTimeout(check, 300);
    };

    check();
  });
}

function getProductsSignature(win) {
  const container = win.document.querySelector(".shop-search-result-view");

  return container?.innerHTML || "";
}

function getCurrentPageLabel(win) {
  return (
    win.document
      .querySelector(".shopee-mini-page-controller__current")
      ?.textContent?.trim() || ""
  );
}

function getNextPageButton(win) {
  return win.document.querySelector(
    ".shopee-button-outline.shopee-mini-page-controller__next-btn",
  );
}

function isPageButtonDisabled(button) {
  if (!button) return true;

  return (
    button.classList.contains("shopee-button-outline--disabled") ||
    button.disabled === true
  );
}

async function clickNextPage(win) {
  const nextButton = getNextPageButton(win);

  if (isPageButtonDisabled(nextButton)) {
    return false;
  }

  nextButton.click();
  return true;
}

function waitProductsRendered(
  win,
  previousSignature,
  previousPageLabel,
  timeout = 15000,
) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    const check = () => {
      try {
        const container = win.document.querySelector(
          ".shop-search-result-view",
        );
        const signature = container?.innerHTML || "";
        const currentPageLabel = getCurrentPageLabel(win);
        const items =
          container?.querySelectorAll(".shop-search-result-view__item") || [];

        if (
          items.length > 0 &&
          signature &&
          (signature !== previousSignature ||
            currentPageLabel !== previousPageLabel)
        ) {
          resolve(items);
          return true;
        }

        return false;
      } catch (err) {
        return false;
      }
    };

    if (check()) return;

    const observer = new MutationObserver(() => {
      if (check()) {
        observer.disconnect();
        return;
      }

      if (Date.now() - start > timeout) {
        observer.disconnect();
        reject(new Error("Timeout render"));
      }
    });

    observer.observe(win.document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function getTotalPagesFromWindow(win) {
  const timeOut = setTimeout(() => {
    const totalEl = win.document.querySelector(
      ".shopee-mini-page-controller__total",
    );

    if (!totalEl) {
      alert(
        "Không tìm thấy tổng số trang. Vui lòng đảm bảo bạn đang ở trang danh sách sản phẩm và thử lại.",
      );
    }
  }, 3000);
  const totalEl = win.document.querySelector(
    ".shopee-mini-page-controller__total",
  );

  if (!totalEl) return 1;

  const total = parseInt(totalEl.textContent?.trim() || "1", 10);

  return isNaN(total) ? 1 : total;
}

// ============================================================================
// Parse HTML
// ============================================================================

function parseProductsFromHTML(htmlContent) {
  const results = [];

  const parser = new DOMParser();

  const doc = parser.parseFromString(htmlContent, "text/html");

  let items = doc.querySelectorAll(".shop-search-result-view__item");

  if (items.length === 0) {
    items = doc.querySelectorAll("[role='group'][aria-label*='Product card']");
  }

  items.forEach((item, index) => {
    try {
      const product = extractProductFromElement(item, index);

      if (product && product["Tên sản phẩm"]) {
        results.push(product);
      }
    } catch (err) {
      console.warn(err);
    }
  });
  console.log({
    results,
  });

  return results;
}

function extractProductFromElement(item, index) {
  return {
    ID: index + 1,

    "Tên sản phẩm": extractName(item),

    "Product ID": extractProductId(item),

    URL: extractProductUrl(item),

    image: extractProductImage(item),

    Giá: extractPrice(item),

    "Chiết khấu": extractDiscount(item),

    "Đánh giá": extractRating(item),

    "Đã bán": extractSoldCount(item),

    "Trạng thái": "Hoạt động",
  };
}

function extractName(item) {
  const ariaLabel = item.querySelector("[aria-label*='Product card']");

  if (ariaLabel) {
    return (
      ariaLabel
        .getAttribute("aria-label")
        ?.replace("Product card: ", "")
        .trim() || ""
    );
  }

  return (
    item
      .querySelector(".whitespace-normal.line-clamp-2")
      ?.textContent?.trim() || ""
  );
}
function extractProductIdFromHref(href) {
  const url = new URL(href, "https://shopee.vn");

  const itemId = url.searchParams.get("22display_model_id");

  if (itemId) return itemId;

  const legacyMatch = href.match(/-i\.(\d+)\.(\d+)/);

  return legacyMatch?.[2] || legacyMatch?.[1] || "N/A";
}
function extractProductId(item) {
  const link =
    item.querySelector("a[href*='22display_model_id']") ||
    item.querySelector("a[href*='-i.']");

  if (link) return extractProductIdFromHref(link.getAttribute("href") || "");
  const match = item.match(/22display_model_id=(\d+)/);

  if (match?.[1]) {
    return match[1];
  }

  const legacyMatch = href.match(/-i\.(\d+)\.(\d+)/);

  return legacyMatch?.[2] || legacyMatch?.[1] || "N/A";
}

function extractProductUrl(item) {
  const link = item.querySelector("a");

  if (!link) return "N/A";

  let href = link.getAttribute("href") || "";

  if (href.startsWith("/")) {
    href = "https://shopee.vn" + href;
  }

  return href;
}

function extractProductImage(item) {
  const imageCandidates = item.querySelectorAll(
    "img[src], img[srcset], img[data-src]",
  );

  for (const image of imageCandidates) {
    const imageUrl = getImageUrlFromElement(image);

    if (imageUrl) {
      return imageUrl;
    }
  }

  return "N/A";
}

function getImageUrlFromElement(image) {
  const src = image.getAttribute("src") || image.getAttribute("data-src") || "";

  if (src && !src.includes("data:image") && src.includes("susercontent")) {
    return src.startsWith("//") ? `https:${src}` : src;
  }

  const srcset = image.getAttribute("srcset") || "";
  if (srcset) {
    const firstCandidate = srcset
      .split(",")
      .map((candidate) => candidate.trim().split(" ")[0])
      .find((candidate) => candidate && !candidate.includes("data:image"));

    if (firstCandidate) {
      return firstCandidate.startsWith("//") ?
          `https:${firstCandidate}`
        : firstCandidate;
    }
  }

  if (src && !src.includes("data:image")) {
    return src.startsWith("//") ? `https:${src}` : src;
  }

  return "";
}

function extractPrice(item) {
  const priceContainers = item.querySelectorAll(
    ".truncate.text-base\\/5.font-medium, [class~='truncate'][class~='text-base/5'][class~='font-medium'], .truncate.flex.items-baseline, [class*='items-baseline']",
  );

  for (const container of priceContainers) {
    const text = container.textContent?.replace(/\s+/g, " ").trim() || "";
    const price = parsePrice(text);

    if (price > 0) {
      return price;
    }
  }

  const text = item.textContent?.replace(/\s+/g, " ").trim() || "";
  return parsePrice(text);
}

function parsePrice(text) {
  if (!text) return 0;

  const normalized = text.replace(/\s+/g, "").toLowerCase();
  const match = normalized.match(/(\d+(?:[.,]\d+)?)([km])?/i);

  if (!match) return 0;

  const rawNumber = match[1].replace(/,/g, ".");
  const value = parseFloat(rawNumber);

  if (Number.isNaN(value)) return 0;

  if (match[2] === "k") {
    return Math.round(value * 1000);
  }

  if (match[2] === "m") {
    return Math.round(value * 1000000);
  }

  if (rawNumber.includes(".") && !rawNumber.includes(",")) {
    const parts = rawNumber.split(".");

    if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) {
      return parseInt(parts.join(""), 10) || 0;
    }
  }

  return Math.round(value);
}

function formatPrice(price) {
  if (!price) return "0 đ";

  return Math.floor(price / 1000) + "k đ";
}

function extractDiscount(item) {
  const spans = item.querySelectorAll("span");

  for (const span of spans) {
    const text = span.textContent?.trim() || "";

    const match = text.match(/-(\d+)%/);

    if (match) return `${match[1]}%`;
  }

  return "0%";
}

function extractRating(item) {
  const spans = item.querySelectorAll("span");

  for (const span of spans) {
    const text = span.textContent?.trim() || "";

    if (/^[4-5]\.\d$/.test(text)) {
      return parseFloat(text);
    }
  }

  return 4.5;
}

function extractSoldCount(item) {
  const elements = item.querySelectorAll("*");

  for (const el of elements) {
    const text = el.textContent?.trim() || "";

    if (text.includes("Đã bán")) {
      const match = text.match(/(\d+[kKmM]?\+?|\d+)/);

      if (match) return match[1];
    }
  }

  return "0";
}

function normalizeProductForWarningPrice(product) {
  return {
    "Product ID": product["Product ID"] || "N/A",
    "Tên sản phẩm": product["Tên sản phẩm"] || "",
    URL: product.URL || "N/A",
    image: product.image || "N/A",
    Giá: normalizePriceValue(product.Giá),
    "Chiết khấu": product["Chiết khấu"] || "0%",
    "Đánh giá": Number(product["Đánh giá"] ?? 0),
    "Đã bán": String(product["Đã bán"] ?? "0"),
    "Trạng thái": product["Trạng thái"] || "Hoạt động",
  };
}

function normalizePriceValue(value) {
  if (typeof value === "number") return value;

  if (value === null || value === undefined) return 0;

  const text = String(value).replace(/\s+/g, "").toLowerCase();
  if (!text) return 0;

  const match = text.match(/^(\d+(?:[.,]\d+)?)([km])?/i);
  if (!match) return 0;

  const numericPart = match[1];
  const suffix = match[2];

  if (suffix === "k") {
    return Math.round(parseFloat(numericPart.replace(/,/g, ".")) * 1000);
  }

  if (suffix === "m") {
    return Math.round(parseFloat(numericPart.replace(/,/g, ".")) * 1000000);
  }

  if (numericPart.includes(".") && !numericPart.includes(",")) {
    const parts = numericPart.split(".");

    if (parts.length > 1 && parts.slice(1).every((part) => part.length === 3)) {
      return parseInt(parts.join(""), 10) || 0;
    }
  }

  return parseInt(numericPart.replace(/[.,]/g, ""), 10) || 0;
}

function normalizeShopUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString();
  } catch (err) {
    return url;
  }
}

// ============================================================================
// CSV Export
// ============================================================================

function downloadCSV(products) {
  if (!products.length) return;

  const headers = Object.keys(products[0]);

  const rows = products.map((product) =>
    headers
      .map((header) => {
        const value = product[header];

        if (typeof value === "string" && value.includes(",")) {
          return `"${value}"`;
        }

        return value;
      })
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);

  link.download = `shopee-products-${Date.now()}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);
}
