import StatsTabs from "./StatsTabs";

type StrapiOrderResponse = {
  data: Array<{
    id: number;
    attributes: {
      orderId: string;
      commission: number;
      StatusId: number | null;
      createdAt?: string;
      import_log?: {
        data?: {
          id: number;
          attributes?: {
            importDate?: string;
          };
        } | null;
      };
    };
  }>;
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

type StrapiStatusResponse = {
  data: Array<{
    id: number;
    attributes: {
      name: string;
    };
  }>;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://127.0.0.1:1337";

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

async function fetchStatusIdsByNormalizedName(targetName: string) {
  const query = new URLSearchParams({
    "pagination[pageSize]": "200",
    "fields[0]": "name",
  });

  const res = await fetch(
    `${API_BASE_URL}/api/order-statuses?${query.toString()}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error("Không thể tải danh sách trạng thái đơn hàng.");
  }

  const json = (await res.json()) as StrapiStatusResponse;
  return json.data
    .filter((item) => normalizeText(item.attributes.name) === targetName)
    .map((item) => item.id);
}

async function fetchOrdersPage(
  page: number,
  pageSize: number
) {
  const query = new URLSearchParams();
  query.set("pagination[page]", String(page));
  query.set("pagination[pageSize]", String(pageSize));
  query.set("fields[0]", "orderId");
  query.set("fields[1]", "commission");
  query.set("fields[2]", "StatusId");
  query.set("fields[3]", "createdAt");
  query.set("populate[import_log][fields][0]", "importDate");

  const res = await fetch(`${API_BASE_URL}/api/orders?${query.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Không thể tải dữ liệu đơn hàng.");
  }

  return (await res.json()) as StrapiOrderResponse;
}

async function fetchAllOrders() {
  const pageSize = 200;
  const firstPage = await fetchOrdersPage(1, pageSize);
  const orders = [...firstPage.data];

  for (let page = 2; page <= firstPage.meta.pagination.pageCount; page += 1) {
    const pageRes = await fetchOrdersPage(page, pageSize);
    orders.push(...pageRes.data);
  }

  return orders;
}

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export default async function PhuongDzuiAdminPage() {
  const completedStatusIds = await fetchStatusIdsByNormalizedName("hoan thanh");
  const pendingStatusIds = await fetchStatusIdsByNormalizedName("dang cho xu ly");
  const allOrders = await fetchAllOrders();

  const latestByOrderId = new Map<
    string,
    {
      statusId: number | null;
      commission: number;
      importLogDate?: string;
      createdAt?: string;
    }
  >();

  for (const item of allOrders) {
    const key = item.attributes.orderId || `unknown-${item.id}`;
    const current = latestByOrderId.get(key);
    const candidate = {
      statusId: item.attributes.StatusId,
      commission: Number(item.attributes.commission) || 0,
      importLogDate: item.attributes.import_log?.data?.attributes?.importDate,
      createdAt: item.attributes.createdAt,
    };

    if (!current) {
      latestByOrderId.set(key, candidate);
      continue;
    }

    const currentDate = new Date(
      current.importLogDate || current.createdAt || 0
    ).getTime();
    const candidateDate = new Date(
      candidate.importLogDate || candidate.createdAt || 0
    ).getTime();

    if (candidateDate >= currentDate) {
      latestByOrderId.set(key, candidate);
    }
  }

  const latestOrders = Array.from(latestByOrderId.values());
  const soDonHoanThanh = latestOrders.filter((order) =>
    completedStatusIds.includes(order.statusId ?? -1)
  ).length;
  const tongHoaHongHoanThanh = latestOrders
    .filter((order) => completedStatusIds.includes(order.statusId ?? -1))
    .reduce((sum, order) => sum + order.commission, 0);
  const tongHoaHongDangChoXuLy = latestOrders
    .filter((order) => pendingStatusIds.includes(order.statusId ?? -1))
    .reduce((sum, order) => sum + order.commission, 0);
  const tienThueHoanThanh = tongHoaHongHoanThanh * 0.1;
  const sauThueHoanThanh = tongHoaHongHoanThanh - tienThueHoanThanh;
  const hoaHongKhach = sauThueHoanThanh * 0.7;
  const thucNhanHoanThanh = sauThueHoanThanh * 0.3;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 bg-zinc-50 px-4 py-6">
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-5 text-white shadow-md">
        <h1 className="text-2xl font-bold">Bảng thống kê hoa hồng</h1>
        <p className="mt-1 text-sm text-blue-100">
          Dữ liệu tổng hợp từ các đơn hàng ở trạng thái Hoàn thành
        </p>
        <p className="mt-2 text-sm font-medium text-blue-50">
          Số đơn hoàn thành: {soDonHoanThanh}
        </p>
      </section>

      <StatsTabs
        tabs={[
          {
            key: "tong-hoa-hong",
            label: "Tổng hoa hồng",
            value: tongHoaHongHoanThanh,
            helper: "Tổng hoa hồng từ các đơn hàng Hoàn thành (đã loại trùng theo import mới nhất).",
          },
          {
            key: "thue-10",
            label: "Tiền thuế 10%",
            value: tienThueHoanThanh,
            helper: "Tiền thuế = Tổng hoa hồng x 10%.",
          },
          {
            key: "hoa-hong-khach",
            label: "Tổng hoa hồng của khách",
            value: hoaHongKhach,
            helper: "Hoa hồng của khách = (Hoa hồng sau thuế) x 70%.",
          },
          {
            key: "hoa-hong-nhan",
            label: "Hoa hồng nhận",
            value: thucNhanHoanThanh,
            helper: "Hoa hồng nhận = (Hoa hồng sau thuế) x 30%.",
          },
        ]}
      />

      <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 shadow-sm">
        <p>
          Công thức đơn hoàn thành: <strong>{formatVnd(tongHoaHongHoanThanh)}</strong>{" "}
          - 10% thuế = <strong>{formatVnd(sauThueHoanThanh)}</strong>, sau đó nhân
          30% = <strong>{formatVnd(thucNhanHoanThanh)}</strong>.
        </p>
        <p className="mt-2">
          Tổng hoa hồng đơn Đang chờ xử lý hiện tại:{" "}
          <strong>{formatVnd(tongHoaHongDangChoXuLy)}</strong>.
        </p>
      </section>
    </main>
  );
}
