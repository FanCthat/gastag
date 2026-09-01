import { prisma } from "@/lib/db";
import BackfillPhoneHashesButton from "./_backfill-phone-hashes";

export default async function AdminDashboard() {
  const [vendorCount, clientCount, activeOrders, pendingEscalations, unsentNotifications] =
    await Promise.all([
      prisma.vendor.count(),
      prisma.client.count(),
      prisma.order.count({ where: { status: { in: ["pending", "confirmed"] } } }),
      prisma.escalationFlag.count({ where: { clearedAt: null } }),
      prisma.notification.count({ where: { sentAt: null, scheduledFor: { lte: new Date() } } }),
    ]);

  const stats = [
    { label: "Vendors", value: vendorCount },
    { label: "Registered clients", value: clientCount },
    { label: "Active orders", value: activeOrders },
    { label: "Open escalations", value: pendingEscalations, warn: pendingEscalations > 0 },
    { label: "Overdue notifications", value: unsentNotifications, warn: unsentNotifications > 0 },
  ];

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(s => (
          <div
            key={s.label}
            className={`bg-white rounded-xl border p-5 ${s.warn ? "border-red-300" : "border-gray-200"}`}
          >
            <div className={`text-3xl font-bold ${s.warn ? "text-red-600" : "text-gray-900"}`}>
              {s.value}
            </div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Data maintenance</h2>
        <div className="max-w-md">
          <BackfillPhoneHashesButton />
        </div>
      </div>
    </div>
  );
}
