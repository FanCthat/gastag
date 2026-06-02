import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function daysUntil(d: Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function statusBadge(days: number) {
  if (days < 0) return { label: "Overdue", cls: "bg-red-100 text-red-700" };
  if (days <= 21) return { label: `${days}d left`, cls: "bg-amber-100 text-amber-700" };
  return { label: `${days}d left`, cls: "bg-green-100 text-green-700" };
}

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vendor: { select: { name: true } },
      appliances: {
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        include: {
          cylinderCycles: {
            orderBy: { cycleNumber: "desc" },
            take: 1,
          },
        },
      },
      orders: {
        orderBy: { placedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!client) notFound();

  const hasActiveAppliances = client.appliances.some(a => a.cylinderCycles.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Supplier: {client.vendor.name}</p>
        </div>

        {/* Cylinders */}
        {client.appliances.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-400 text-center">
            No appliances registered yet.
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Your cylinders</h2>
            {client.appliances.map(appliance => {
              const cycle = appliance.cylinderCycles[0];
              const days = cycle ? daysUntil(cycle.predictedEmptyDate) : null;
              const badge = days !== null ? statusBadge(days) : null;

              return (
                <div key={appliance.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 capitalize">
                        {appliance.applianceType.replace("_", " ")} — {appliance.cylinderSizeKg}kg
                      </div>
                      {cycle && (
                        <div className="text-sm text-gray-500 mt-0.5">
                          Predicted empty: {formatDate(cycle.predictedEmptyDate)}
                        </div>
                      )}
                    </div>
                    {badge && (
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Order button */}
        {hasActiveAppliances && (
          <Link
            href={`/reorder/${clientId}`}
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white text-center font-semibold py-3 rounded-xl transition-colors"
          >
            Order gas now
          </Link>
        )}

        {/* Recent orders */}
        {client.orders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Recent orders</h2>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {client.orders.map(order => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
                  <div className="text-sm text-gray-700">{formatDate(order.placedAt)}</div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      order.status === "delivered"
                        ? "bg-green-100 text-green-700"
                        : order.status === "confirmed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Address */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Delivery address</div>
          <div className="text-sm text-gray-700">{client.deliveryAddress}</div>
        </div>
      </div>
    </div>
  );
}
