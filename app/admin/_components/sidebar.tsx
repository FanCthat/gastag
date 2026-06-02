"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/qr-codes", label: "QR Codes" },
  { href: "/admin/templates", label: "Notification Templates" },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-gray-900 min-h-screen flex flex-col">
      <div className="px-5 py-6 border-b border-gray-700">
        <span className="text-white font-bold text-lg">GasTag</span>
        <span className="block text-xs text-gray-400 mt-0.5">Admin Portal</span>
      </div>
      <nav className="flex-1 py-4 px-3 space-y-1">
        {links.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname.startsWith(l.href)
                ? "bg-orange-500 text-white"
                : "text-gray-300 hover:bg-gray-800 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <div className="px-3 py-4 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
