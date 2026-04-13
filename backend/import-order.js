const axios = require("axios");
const fs = require("fs");
const { parse } = require("csv-parse");
const http = require("http");

// --- CẤU HÌNH ---
const STRAPI_API = "http://localhost:1337/api";
const STRAPI_TOKEN =
  "79041647eac6588eb533da7c2dde5e1c816c69e18db2648dafcbbf12a1cbd95cb99629ab0ebf9a6ca39cbfacb69dbbb687637da0df953964ca1175b7bc86d3d4c626243a41b27cefc3aef427fa967f5b2ede515cf17e61267007083b68f5e487594b1e4cb9937c7a8bbc37ffe0290f97bdd1af33c8b6a1eaf01b047ad16c9d5b".trim();
const ORDERS_CSV_PATH = "./orders-cu.csv";

const api = axios.create({
  baseURL: STRAPI_API,
  httpAgent: new http.Agent({ family: 4, keepAlive: true }),
  headers: {
    Authorization: `Bearer ${STRAPI_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let statusMap = {};

/**
 * Bước 1: Tải danh mục trạng thái
 */
async function loadStatusMap() {
  try {
    const response = await api.get("/order-statuses");
    const items = response.data.data;
    items.forEach((item) => {
      const name = (item.attributes ? item.attributes.name : item.name).trim();
      statusMap[name] = item.id;
    });
    console.log("✅ Đã nạp danh mục trạng thái:", statusMap);
  } catch (error) {
    console.error("❌ Lỗi kết nối server Strapi:", error.message);
    process.exit(1);
  }
}

/**
 * Bước 2: Tạo phiên Import mới với FileName kèm Ngày-Giờ chi tiết
 */
async function createImportLog() {
  try {
    const now = new Date();

    // Định dạng: DD-MM-YYYY_HH-mm-ss (Ví dụ: 13-04-2026_14-30-05)
    const dateStr = now.toLocaleDateString("vi-VN").replace(/\//g, "-");
    const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "-");
    const fullTimeStamp = `${dateStr}_${timeStr}`;

    const logData = {
      importDate: now.toISOString(),
      fileName: `orders_${fullTimeStamp}.csv`,
    };

    const response = await api.post("/import-logs", { data: logData });
    const logId = response.data.data.id;
    console.log(
      `📝 Đã tạo phiên Import mới: ${logData.fileName} (ID: ${logId})`
    );
    return logId;
  } catch (error) {
    console.error("❌ Không tạo được ImportLog:", error.message);
    process.exit(1);
  }
}

/**
 * Bước 3: Xử lý Import
 */
async function importOrders() {
  await loadStatusMap();
  const currentImportLogId = await createImportLog();

  if (!fs.existsSync(ORDERS_CSV_PATH)) {
    console.error("❌ Không tìm thấy file orders.csv trong thư mục hiện tại!");
    return;
  }

  const parser = fs.createReadStream(ORDERS_CSV_PATH).pipe(
    parse({
      columns: true,
      trim: true,
      bom: true,
    })
  );

  let successCount = 0;
  let failCount = 0;
  let totalRows = 0;

  console.log("🚀 Bắt đầu gửi dữ liệu lên Strapi...");

  for await (const row of parser) {
    totalRows++;
    try {
      const csvStatusName = row["Trạng thái đặt hàng"]?.trim();
      const matchedStatusId = statusMap[csvStatusName] || null;

      const orderData = {
        orderId: row["ID đơn hàng"] || "",
        StatusId: matchedStatusId,
        orderDate: row["Thời Gian Đặt Hàng"] || "",
        successDate: row["Thời gian hoàn thành"] || "",
        shopName: row["Tên Shop"] || "",
        shopId: row["Shop id"] || "",
        itemId: row["Item id"] || "",
        itemName: row["Tên Item"] || "",
        orderPrice:
          parseFloat(
            (row["Giá trị đơn hàng (₫)"] || "0").replace(/[^0-9.-]+/g, "")
          ) || 0,
        subId: row["Sub_id1"] || "",
        commission:
          parseFloat(
            (row["Hoa hồng ròng tiếp thị liên kết(₫)"] || "0").replace(
              /[^0-9.-]+/g,
              ""
            )
          ) || 0,

        // Liên kết tới bảng ImportLog
        import_log: currentImportLogId,
      };

      await api.post("/orders", { data: orderData });

      successCount++;
      if (successCount % 20 === 0) {
        console.log(`⏳ Đã nhập thành công ${successCount} đơn hàng...`);
      }

      await sleep(100);
    } catch (err) {
      failCount++;
      const errorDetail = err.response?.data?.error?.message || err.message;
      console.log(`❌ Lỗi tại đơn ${row["ID đơn hàng"]}: ${errorDetail}`);
    }
  }

  console.log("\n-----------------------------------");
  console.log("📊 TỔNG KẾT IMPORT");
  console.log(`- Tổng số dòng xử lý: ${totalRows}`);
  console.log(`- Nhập thành công: ${successCount}`);
  console.log(`- Thất bại: ${failCount}`);
  console.log(`- ID phiên Import: ${currentImportLogId}`);
  console.log(
    `💡 Mẹo: Vào Strapi lọc import_log ID = ${currentImportLogId} để kiểm tra.`
  );
  console.log("-----------------------------------\n");
}

importOrders();
