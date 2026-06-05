import { prisma } from "@/lib/db";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const statusColour: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  delivered: "bg-green-100 text-green-700",
};

export default async function AdminOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: 100,
    include: {
      client: { select: { name: true, email: true } },
      vendor: { select: { name: true } },
      orderItems: {
        include: { appliance: { select: { applianceType: true, cylinderSizeKg: true } } },
      },
    },
  });

  const pending = orders.filter(o => o.status === "pending" || o.status === "confirmed");
  const delivered = orders.filter(o => o.status === "delivered");

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Orders</h1>
      <p className="text-sm text-gray-500 mb-8">All orders across all vendors. Use this to investigate stale or unconfirmed orders.</p>

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Pending / Unconfirmed ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map(order => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-5 py-4 mb-10">
          No pending orders — all caught up.
        </div>
      )}

      <section>
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
          Delivered (last {delivered.length})
        </h2>
        <div className="space-y-3">
          {delivered.map(order => (
            <OrderRow key={order.id} order={order} />
          ))}
        </div>
      </section>
    </div>
  );
}

function OrderRow({ order }: { order: any }) {
  const colour = statusColour[order.status] ?? "bg-gray-100 text-gray-600";
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="font-semibold text-gray-900">{order.client.name}</div>
          <div className="text-xs text-gray-500">{order.client.email}</div>
          <div className="text-xs text-gray-400 mt-0.5">Vendor: {order.vendor.name}</div>
          <div className="mt-2 space-y-0.5">
            {order.orderItems.map((item: any, i: number) => (
              <div key={i} className="text-sm text-gray-600">
                • {item.appliance.cylinderSizeKg}kg {item.appliance.applianceType.replace(/_/g, " ")}
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">Placed: {formatDate(order.placedAt)}</div>
          {order.deliveredAt && (
            <div className="text-xs text-gray-400">Delivered: {formatDate(order.deliveredAt)}</div>
          )}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colour}`}>
          {order.status}
        </span>
      </div>
      <div className="mt-2 pt-2 border-t border-gray-100">
        <span className="font-mono text-xs text-gray-300">{order.id}</span>
      </div>
    </div>
  );
}
