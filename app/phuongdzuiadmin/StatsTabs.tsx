"use client";

import { useState } from "react";

type TabItem = {
  key: string;
  label: string;
  value: number;
  helper: string;
};

type Props = {
  tabs: TabItem[];
};

function formatVnd(value: number) {
  return `${value.toLocaleString("vi-VN")} VND`;
}

export default function StatsTabs({ tabs }: Props) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "");
  const activeTab = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  if (!activeTab) return null;

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveKey(tab.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                isActive
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl bg-zinc-50 p-4">
        <p className="text-sm text-zinc-500">{activeTab.label}</p>
        <p className="mt-2 text-3xl font-bold text-zinc-900">
          {formatVnd(activeTab.value)}
        </p>
        <p className="mt-2 text-sm text-zinc-600">{activeTab.helper}</p>
      </div>
    </section>
  );
}
