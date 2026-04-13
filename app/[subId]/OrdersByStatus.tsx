"use client";

import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: number;
  orderId: string;
  orderDate: string;
  successDate: string;
  itemName: string;
  shopName: string;
  orderPrice: number;
  commission: number;
  statusLabel: string;
  createdAt?: string;
  importLogDate?: string;
};

type OrderGroup = {
  orderId: string;
  orderDate: string;
  shopName: string;
  statusLabels: string[];
  totalPrice: number;
  totalCommission: number;
  items: OrderItem[];
};

type Props = {
  subId: string;
};

const ALL_TAB = "all";
const API_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://127.0.0.1:1337";

type StatusVisual = {
  tabActive: string;
  tabInactive: string;
  badge: string;
};

/** Fixed status colors — tab and badge match */
const STATUS_OVERRIDES: Record<string, StatusVisual> = {
  "Hoan thanh": {
    tabActive: "border-emerald-600 bg-emerald-600 text-white",
    tabInactive:
      "border-emerald-400 bg-emerald-50 text-emerald-900 hover:bg-emerald-100",
    badge: "bg-emerald-100 text-emerald-800",
  },
  "Da huy": {
    tabActive: "border-neutral-500 bg-neutral-500 text-white",
    tabInactive:
      "border-neutral-400 bg-neutral-100 text-neutral-800 hover:bg-neutral-200",
    badge: "bg-neutral-200 text-neutral-800",
  },
  "Chua thanh toan": {
    tabActive: "border-yellow-500 bg-yellow-500 text-white",
    tabInactive:
      "border-yellow-400 bg-yellow-50 text-yellow-950 hover:bg-yellow-100",
    badge: "bg-yellow-100 text-yellow-950",
  },
  "Dang cho xu ly": {
    tabActive: "border-yellow-500 bg-yellow-400 text-zinc-900",
    tabInactive:
      "border-yellow-400 bg-yellow-50 text-yellow-950 hover:bg-yellow-100",
    badge: "bg-yellow-100 text-yellow-950",
  },
  "Cho xac nhan": {
    tabActive: "border-amber-500 bg-amber-500 text-white",
    tabInactive:
      "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100",
    badge: "bg-amber-100 text-amber-900",
  },
  "Dang giao": {
    tabActive: "border-sky-600 bg-sky-600 text-white",
    tabInactive: "border-sky-400 bg-sky-50 text-sky-900 hover:bg-sky-100",
    badge: "bg-sky-100 text-sky-900",
  },
  "Da giao": {
    tabActive: "border-cyan-600 bg-cyan-600 text-white",
    tabInactive: "border-cyan-400 bg-cyan-50 text-cyan-900 hover:bg-cyan-100",
    badge: "bg-cyan-100 text-cyan-900",
  },
  "Khong xac dinh": {
    tabActive: "border-stone-500 bg-stone-500 text-white",
    tabInactive:
      "border-stone-400 bg-stone-100 text-stone-800 hover:bg-stone-200",
    badge: "bg-stone-200 text-stone-800",
  },
};

/** Other statuses: stable color from normalized name (hash) */
const STATUS_PALETTE: StatusVisual[] = [
  {
    tabActive: "border-violet-600 bg-violet-600 text-white",
    tabInactive:
      "border-violet-400 bg-violet-50 text-violet-900 hover:bg-violet-100",
    badge: "bg-violet-100 text-violet-900",
  },
  {
    tabActive: "border-blue-600 bg-blue-600 text-white",
    tabInactive: "border-blue-400 bg-blue-50 text-blue-900 hover:bg-blue-100",
    badge: "bg-blue-100 text-blue-900",
  },
  {
    tabActive: "border-indigo-600 bg-indigo-600 text-white",
    tabInactive:
      "border-indigo-400 bg-indigo-50 text-indigo-900 hover:bg-indigo-100",
    badge: "bg-indigo-100 text-indigo-900",
  },
  {
    tabActive: "border-fuchsia-600 bg-fuchsia-600 text-white",
    tabInactive:
      "border-fuchsia-400 bg-fuchsia-50 text-fuchsia-900 hover:bg-fuchsia-100",
    badge: "bg-fuchsia-100 text-fuchsia-900",
  },
  {
    tabActive: "border-pink-600 bg-pink-600 text-white",
    tabInactive: "border-pink-400 bg-pink-50 text-pink-900 hover:bg-pink-100",
    badge: "bg-pink-100 text-pink-900",
  },
  {
    tabActive: "border-rose-600 bg-rose-600 text-white",
    tabInactive: "border-rose-400 bg-rose-50 text-rose-900 hover:bg-rose-100",
    badge: "bg-rose-100 text-rose-900",
  },
  {
    tabActive: "border-lime-600 bg-lime-600 text-white",
    tabInactive: "border-lime-500 bg-lime-50 text-lime-900 hover:bg-lime-100",
    badge: "bg-lime-100 text-lime-900",
  },
  {
    tabActive: "border-teal-600 bg-teal-600 text-white",
    tabInactive: "border-teal-400 bg-teal-50 text-teal-900 hover:bg-teal-100",
    badge: "bg-teal-100 text-teal-900",
  },
  {
    tabActive: "border-red-600 bg-red-600 text-white",
    tabInactive: "border-red-400 bg-red-50 text-red-900 hover:bg-red-100",
    badge: "bg-red-100 text-red-900",
  },
  {
    tabActive: "border-purple-600 bg-purple-600 text-white",
    tabInactive:
      "border-purple-400 bg-purple-50 text-purple-900 hover:bg-purple-100",
    badge: "bg-purple-100 text-purple-900",
  },
];

function normalizeStatusLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function hashStatusKey(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getStatusStyle(label: string): StatusVisual {
  const key = normalizeStatusLabel(label);
  const override = STATUS_OVERRIDES[key];
  if (override) return override;

  const idx = hashStatusKey(key.toLowerCase()) % STATUS_PALETTE.length;
  return STATUS_PALETTE[idx];
}

function isCompletedStatus(label: string) {
  return normalizeStatusLabel(label).toLowerCase() === "hoan thanh";
}

function isPendingStatus(label: string) {
  const normalized = normalizeStatusLabel(label).toLowerCase();
  return (
    normalized === "dang cho xu ly" ||
    normalized === "cho xu ly" ||
    normalized.includes("dang cho") ||
    normalized.includes("xu ly")
  );
}

function toTimestamp(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime();
  }

  const raw = value.trim();
  const match = raw.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/
  );
  if (!match) return 0;

  const day = Number(match[1]);
  const month = Number(match[2]) - 1;
  const year = Number(match[3].length === 2 ? `20${match[3]}` : match[3]);
  const hour = Number(match[4] || 0);
  const minute = Number(match[5] || 0);
  const second = Number(match[6] || 0);

  return new Date(year, month, day, hour, minute, second).getTime();
}

function formatDateTime(value?: string) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return "-";

  const date = new Date(timestamp);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

type StrapiListResponse<T> = {
  data: Array<{
    id: number;
    attributes: T;
  }>;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
};

type CustomerAttributes = {
  name: string;
};

type OrderAttributes = {
  orderId: string;
  StatusId: number | null;
  orderDate: string;
  successDate: string;
  shopName: string;
  itemName: string;
  orderPrice: number;
  commission: number;
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

type StatusAttributes = {
  name: string;
};

export default function OrdersByStatus({ subId }: Props) {
  const toCommission = (price: number) => Math.round(price * 0.9 * 0.7);
  const formatVnd = (value: number) => `${value.toLocaleString("vi-VN")} VND`;

  const [customerName, setCustomerName] = useState(subId);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [allStatuses, setAllStatuses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const [customerRes, statusRes] = await Promise.all([
          fetch(
            `${API_BASE_URL}/api/customers?filters[subId][$eq]=${encodeURIComponent(subId)}&pagination[pageSize]=1`
          ),
          fetch(`${API_BASE_URL}/api/order-statuses?pagination[pageSize]=200`),
        ]);

        if (!customerRes.ok || !statusRes.ok) {
          throw new Error("Không thể tải dữ liệu");
        }

        const customerJson =
          (await customerRes.json()) as StrapiListResponse<CustomerAttributes>;
        const statusJson =
          (await statusRes.json()) as StrapiListResponse<StatusAttributes>;

        const fetchOrdersPage = async (page: number, pageSize: number) => {
          const ordersRes = await fetch(
            `${API_BASE_URL}/api/orders?filters[subId][$eq]=${encodeURIComponent(
              subId
            )}&sort[0]=createdAt:desc&pagination[page]=${page}&pagination[pageSize]=${pageSize}&populate[import_log][fields][0]=importDate`
          );

          if (!ordersRes.ok) {
            throw new Error("Không thể tải dữ liệu đơn hàng");
          }

          return (await ordersRes.json()) as StrapiListResponse<OrderAttributes>;
        };

        const ordersPageSize = 200;
        const firstOrdersPage = await fetchOrdersPage(1, ordersPageSize);
        const allOrderRows = [...firstOrdersPage.data];
        const totalOrderPages = firstOrdersPage.meta?.pagination?.pageCount ?? 1;

        for (let page = 2; page <= totalOrderPages; page += 1) {
          const pageRes = await fetchOrdersPage(page, ordersPageSize);
          allOrderRows.push(...pageRes.data);
        }

        const statusLabelMap = new Map<number, string>();
        for (const item of statusJson.data) {
          statusLabelMap.set(item.id, item.attributes.name);
        }
        const statusLabels = statusJson.data
          .map((item) => item.attributes.name)
          .filter(Boolean);

        const mappedOrders: OrderItem[] = allOrderRows.map((item) => {
          const statusId = Number(item.attributes.StatusId);
          const statusLabel =
            (!Number.isNaN(statusId) && statusLabelMap.get(statusId)) ||
            "Không xác định";

          return {
            id: item.id,
            orderId: item.attributes.orderId,
            orderDate: item.attributes.orderDate,
            successDate: item.attributes.successDate,
            itemName: item.attributes.itemName,
            shopName: item.attributes.shopName,
            orderPrice: item.attributes.orderPrice,
            commission: toCommission(Number(item.attributes.commission || 0)),
            statusLabel,
            createdAt: item.attributes.createdAt,
            importLogDate: item.attributes.import_log?.data?.attributes?.importDate,
          };
        });

        if (!isMounted) {
          return;
        }

        setCustomerName(customerJson.data[0]?.attributes.name ?? subId);
        setOrders(mappedOrders);
        setAllStatuses(statusLabels);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Lỗi không xác định";
        setError(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    run();

    return () => {
      isMounted = false;
    };
  }, [subId]);

  const tabs = useMemo(() => {
    const labels = Array.from(new Set(allStatuses));
    return [
      { key: ALL_TAB, label: "Tat ca" },
      ...labels.map((label) => ({ key: label, label })),
    ];
  }, [allStatuses]);

  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);

  const filteredOrders = useMemo(() => {
    if (activeTab === ALL_TAB) {
      return orders;
    }
    return orders.filter((order) => order.statusLabel === activeTab);
  }, [activeTab, orders]);

  const latestOrdersByImportLog = useMemo(() => {
    const latestByOrderId = new Map<string, OrderItem>();

    for (const order of orders) {
      const key = order.orderId || `unknown-${order.id}`;
      const current = latestByOrderId.get(key);

      if (!current) {
        latestByOrderId.set(key, order);
        continue;
      }

      const currentDate = new Date(
        current.importLogDate || current.createdAt || 0
      ).getTime();
      const candidateDate = new Date(
        order.importLogDate || order.createdAt || 0
      ).getTime();

      if (candidateDate >= currentDate) {
        latestByOrderId.set(key, order);
      }
    }

    return Array.from(latestByOrderId.values());
  }, [orders]);

  const getLatestCommissionByStatus = (matcher: (label: string) => boolean) => {
    return latestOrdersByImportLog
      .filter((order) => matcher(order.statusLabel))
      .reduce((sum, order) => sum + order.commission, 0);
  };

  const totalCompletedCommission = useMemo(
    () => getLatestCommissionByStatus(isCompletedStatus),
    [latestOrdersByImportLog]
  );
  const totalPendingCommission = useMemo(
    () => getLatestCommissionByStatus(isPendingStatus),
    [latestOrdersByImportLog]
  );

  const groupedOrders = useMemo<OrderGroup[]>(() => {
    const groupMap = new Map<string, OrderGroup>();

    for (const order of filteredOrders) {
      const key = order.orderId || `unknown-${order.id}`;
      const current = groupMap.get(key);

      if (!current) {
        groupMap.set(key, {
          orderId: order.orderId || "Không có mã đơn",
          orderDate: order.orderDate,
          shopName: order.shopName,
          statusLabels: [order.statusLabel],
          totalPrice: Number(order.orderPrice || 0),
          totalCommission: Number(order.commission || 0),
          items: [order],
        });
        continue;
      }

      if (!current.statusLabels.includes(order.statusLabel)) {
        current.statusLabels.push(order.statusLabel);
      }
      current.totalPrice += Number(order.orderPrice || 0);
      current.totalCommission += Number(order.commission || 0);
      current.items.push(order);
    }

    return Array.from(groupMap.values()).sort(
      (a, b) => toTimestamp(b.orderDate) - toTimestamp(a.orderDate)
    );
  }, [filteredOrders]);

  const totalPages = Math.max(1, Math.ceil(groupedOrders.length / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, pageSize, subId]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return groupedOrders.slice(start, start + pageSize);
  }, [currentPage, groupedOrders, pageSize]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 bg-zinc-50 px-4 py-6">
      <section className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 p-4 text-white shadow-md">
        <h1 className="text-xl font-semibold sm:text-2xl">
          Xin chào {customerName}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-wide text-emerald-100">
          Tổng hoa hồng đã hoàn thành
        </p>
        <p className="text-2xl font-bold sm:text-3xl">
          {formatVnd(totalCompletedCommission)}
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-xl border border-yellow-300 bg-yellow-50 p-4 shadow-sm">
          <p className="text-sm text-yellow-900">Tổng hoa hồng đang chờ xử lý</p>
          <p className="mt-1 text-xl font-bold text-yellow-900">
            {formatVnd(totalPendingCommission)}
          </p>
        </article>
        <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-sm text-emerald-700">Tổng hoa hồng đã hoàn thành</p>
          <p className="mt-1 text-xl font-bold text-emerald-700">
            {formatVnd(totalCompletedCommission)}
          </p>
        </article>
      </section>

      {isLoading ? (
        <p className="text-sm text-zinc-600">Đang tải dữ liệu...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const statusStyle =
            tab.key === ALL_TAB ? null : getStatusStyle(tab.label);
          const inactiveClass =
            "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100";
          const tabClass = !isActive
            ? inactiveClass
            : tab.key === ALL_TAB
              ? "border-black bg-black text-white"
              : statusStyle!.tabActive;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${tabClass}`}
            >
              {tab.key === ALL_TAB ? "Tất cả" : tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {groupedOrders.length} đơn hàng
        </p>
        <label className="flex items-center gap-2 text-sm text-zinc-600">
          Hiển thị
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm"
          >
            <option value={20}>20</option>
            <option value={40}>40</option>
            <option value={60}>60</option>
          </select>
          / trang
        </label>
      </div>

      <div className="grid gap-3">
        {!paginatedOrders.length && !isLoading ? (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
            Không có đơn hàng trong trạng thái này.
          </div>
        ) : null}
        {paginatedOrders.map((orderGroup) => (
          <article
            key={orderGroup.orderId}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">Đơn hàng #{orderGroup.orderId}</p>
                <p className="mt-1 text-sm text-zinc-600">
                  {orderGroup.items.length} sản phẩm
                </p>
              </div>
              <div className="flex max-w-[min(100%,20rem)] flex-wrap justify-end gap-1.5">
                {Array.from(new Set(orderGroup.statusLabels)).map((label) => (
                  <span
                    key={label}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      getStatusStyle(label).badge
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 grid gap-1 text-sm text-zinc-600">
              <p>Shop: {orderGroup.shopName || "-"}</p>
              <p>Ngày đặt: {formatDateTime(orderGroup.orderDate)}</p>
              <p>Giá trị đơn: {formatVnd(orderGroup.totalPrice)}</p>
            </div>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Sản phẩm
              </p>
              <ul className="mt-2 grid gap-1.5 text-sm text-zinc-700">
                {orderGroup.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-2">
                    <span>{item.itemName || "Không có tên sản phẩm"}</span>
                    <span className="text-zinc-500">
                      {formatVnd(item.commission)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-3 rounded-lg bg-emerald-50 p-3">
              <p className="text-xs uppercase tracking-wide text-emerald-700">
                Hoa hồng
              </p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatVnd(orderGroup.totalCommission)}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Trước
        </button>
        <p className="text-sm text-zinc-600">
          Trang {currentPage}/{totalPages}
        </p>
        <button
          type="button"
          onClick={() =>
            setCurrentPage((prev) => Math.min(totalPages, prev + 1))
          }
          disabled={currentPage === totalPages}
          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Sau
        </button>
      </div>
    </main>
  );
}
