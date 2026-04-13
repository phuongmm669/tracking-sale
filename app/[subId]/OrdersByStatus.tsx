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
const STATUS_STYLES: Record<string, { tab: string; badge: string }> = {
  "Hoan thanh": {
    tab: "border-emerald-600 bg-emerald-600 text-white",
    badge: "bg-emerald-100 text-emerald-700",
  },
  "Da huy": {
    tab: "border-rose-600 bg-rose-600 text-white",
    badge: "bg-rose-100 text-rose-700",
  },
  "Cho xac nhan": {
    tab: "border-amber-500 bg-amber-500 text-white",
    badge: "bg-amber-100 text-amber-700",
  },
  "Dang giao": {
    tab: "border-sky-600 bg-sky-600 text-white",
    badge: "bg-sky-100 text-sky-700",
  },
};

function normalizeStatusLabel(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function getStatusStyle(label: string) {
  return (
    STATUS_STYLES[normalizeStatusLabel(label)] ?? {
      tab: "border-indigo-600 bg-indigo-600 text-white",
      badge: "bg-indigo-100 text-indigo-700",
    }
  );
}

function isCompletedStatus(label: string) {
  return normalizeStatusLabel(label).toLowerCase() === "hoan thanh";
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

        const mappedOrders: OrderItem[] = allOrderRows.map((item) => ({
          id: item.id,
          orderId: item.attributes.orderId,
          orderDate: item.attributes.orderDate,
          successDate: item.attributes.successDate,
          itemName: item.attributes.itemName,
          shopName: item.attributes.shopName,
          orderPrice: item.attributes.orderPrice,
          commission: toCommission(Number(item.attributes.commission || 0)),
          statusLabel:
            (item.attributes.StatusId != null &&
              statusLabelMap.get(item.attributes.StatusId)) ||
            "Không xác định",
          createdAt: item.attributes.createdAt,
          importLogDate: item.attributes.import_log?.data?.attributes?.importDate,
        }));

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

  const totalCommission = useMemo(() => {
    const latestCompletedByOrderId = new Map<string, OrderItem>();

    for (const order of orders) {
      if (!isCompletedStatus(order.statusLabel)) {
        continue;
      }

      const key = order.orderId || `unknown-${order.id}`;
      const current = latestCompletedByOrderId.get(key);

      if (!current) {
        latestCompletedByOrderId.set(key, order);
        continue;
      }

      const currentDate = new Date(
        current.importLogDate || current.createdAt || 0
      ).getTime();
      const candidateDate = new Date(
        order.importLogDate || order.createdAt || 0
      ).getTime();

      if (candidateDate >= currentDate) {
        latestCompletedByOrderId.set(key, order);
      }
    }

    return Array.from(latestCompletedByOrderId.values()).reduce(
      (sum, order) => sum + order.commission,
      0
    );
  }, [orders]);

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

    return Array.from(groupMap.values());
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
          Tổng hoa hồng
        </p>
        <p className="text-2xl font-bold sm:text-3xl">
          {formatVnd(totalCommission)}
        </p>
      </section>

      {isLoading ? (
        <p className="text-sm text-zinc-600">Đang tải dữ liệu...</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const statusStyle = getStatusStyle(tab.label);
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                isActive
                  ? tab.key === ALL_TAB
                    ? "border-black bg-black text-white"
                    : statusStyle.tab
                  : "border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100"
              }`}
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
              <span
                className={`rounded-full px-3 py-1 text-xs ${
                  getStatusStyle(orderGroup.statusLabels[0] ?? "").badge
                }`}
              >
                {orderGroup.statusLabels.length === 1
                  ? orderGroup.statusLabels[0]
                  : `${orderGroup.statusLabels.length} trạng thái`}
              </span>
            </div>
            <div className="mt-3 grid gap-1 text-sm text-zinc-600">
              <p>Shop: {orderGroup.shopName || "-"}</p>
              <p>Ngày đặt: {orderGroup.orderDate || "-"}</p>
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
