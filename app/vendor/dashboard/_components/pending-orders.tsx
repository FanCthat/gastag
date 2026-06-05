"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  placedAt: Date;
  deliveryAddress: string;
  status: string;
  client: { name: string; email: string; deliveryAddress: string };
  orderItems: {
    appliance: { applianceType: string; cylinderSizeKg: number };
  }[];
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

export default function PendingOrders({ orders, vendorId }: { orders: Order[]; vendorId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  async function confirmDelivery(orderId: string) {
    setConfirming(orderId);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/vendor/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setConfirmError(d.error || "Confirmation failed — please try again.");
      } else {
        router.refresh();
      }
    } catch {
      setConfirmError("Network error — please check your connection and try again.");
    } finally {
      setConfirming(null);
    }
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No pending orders. You're all caught up.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        {orders.length} pending order{orders.length !== 1 ? "s" : ""}
      </h2>
      {confirmError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {confirmError}
        </div>
      )}
      {orders.map(order => (
        <div key={order.id} className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-semibold text-gray-900">{order.client.name}</div>
              <div className="text-sm text-gray-500">{order.client.email}</div>
              <div className="mt-2 text-sm text-gray-700">
                <span className="font-medium">Deliver to:</span> {order.deliveryAddress}
              </div>
              <div className="mt-2 space-y-1">
                {order.orderItems.map((item, i) => (
                  <div key={i} className="text-sm text-gray-600">
                    • {item.appliance.cylinderSizeKg}kg cylinder ({item.appliance.applianceType})
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-gray-400">Ordered {formatDate(order.placedAt)}</div>
            </div>
            <button
              onClick={() => confirmDelivery(order.id)}
              disabled={confirming === order.id}
              className="shrink-0 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {confirming === order.id ? "…" : "Confirm delivery"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
