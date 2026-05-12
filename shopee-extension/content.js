/**
 * Content Script - Chạy trong context của trang Shopee
 * Lấy thông tin shop từ URL & lấy HTML sản phẩm
 *
 * @format
 */

// Hàm để chờ element xuất hiện (với timeout)
function waitForElement(selector, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        resolve(element);
        return;
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for ${selector}`));
        return;
      }

      // Kiểm tra lại sau 200ms
      setTimeout(checkElement, 200);
    };

    checkElement();
  });
}

chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  // Extract HTML sản phẩm từ page hiện tại hoặc từ URL khác
  if (req.action === "getProductsHTML") {
    (async () => {
      try {
        // Chờ container xuất hiện (tối đa 8 giây)
        const productsContainer = await waitForElement(
          ".shop-search-result-view",
          8000,
        );

        if (productsContainer) {
          const htmlContent = productsContainer.innerHTML;
          sendResponse({
            html: htmlContent,
            success: true,
          });
        } else {
          sendResponse({
            error: "Không tìm thấy container sản phẩm",
            success: false,
          });
        }
      } catch (error) {
        sendResponse({
          error: error.message || "Timeout chờ products container",
          success: false,
        });
      }
    })();

    // Trả về true để giữ sendResponse channel mở
    return true;
  }

  // Fetch HTML từ URL khác (dùng fetch API)
  if (req.action === "getFeedFromUrl") {
    const targetUrl = req.url;

    fetch(targetUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((html) => {
        // Parse HTML và extract products container
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        // Tìm container trong parsed HTML
        const container = doc.querySelector(".shop-search-result-view");

        if (container) {
          sendResponse({
            html: container.innerHTML,
            success: true,
          });
        } else {
          // Nếu không tìm thấy trong lần đầu, xem HTML đầy đủ
          const bodyContent = doc.body?.innerHTML || html;
          sendResponse({
            html: bodyContent,
            success: true,
            note: "Lấy full HTML vì không tìm thấy container",
          });
        }
      })
      .catch((error) => {
        sendResponse({
          error: error.message || "Lỗi fetch URL",
          success: false,
        });
      });

    return true; // Để async operation hoàn tất
  }
});
