"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export default function VendorNav({ activeTab, pendingCount }: { activeTab: string; pendingCount: number }) {
  const tabs = [
    { key: "orders", label: "Orders", badge: pendingCount },
    { key: "clients", label: "Clients" },
    { key: "specials", label: "Specials" },
  ];

  return (
    <div className="flex items-center gap-4">
      <nav className="flex gap-1">
        {tabs.map(t => (
          <Link
            key={t.key}
            href={`/vendor/dashboard?tab=${t.key}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === t.key
                ? "bg-orange-500 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {t.label}
            {t.badge ? (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === t.key ? "bg-white/30 text-white" : "bg-orange-500 text-white"
              }`}>
                {t.badge}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      <button
        onClick={() => signOut({ callbackUrl: "/vendor/login" })}
        className="text-xs text-gray-400 hover:text-gray-600"
      >
        Sign out
      </button>
    </div>
  );
}
