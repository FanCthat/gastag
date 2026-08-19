import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getVendorDataKey, resolveField, resolveCylinderSize } from "@/lib/client-crypto";
import DeleteCylinderButton from "./_components/delete-cylinder-button";
import EditProfileForm from "./_components/edit-profile-form";

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
      vendor: { select: { name: true, encryptionOn: true, wrappedDataKey: true } },
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

  const dataKey = (client.vendor.encryptionOn && client.vendor.wrappedDataKey)
    ? getVendorDataKey(client.vendor.wrappedDataKey)
    : null;

  const clientName    = resolveField(client.nameEnc,            client.name,            dataKey);
  const clientEmail   = resolveField(client.emailEnc,           client.email,           dataKey);
  const clientPhone   = client.phoneEnc
    ? resolveField(client.phoneEnc, client.phone, dataKey)
    : (client.phone ?? null);

  const appliances = client.appliances.map(a => ({
    ...a,
    cylinderSizeKg: resolveCylinderSize(a.cylinderSizeKg, a.cylinderSizeEnc ?? null, dataKey),
  }));

  const hasActiveAppliances = appliances.some(a => a.cylinderCycles.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto py-8 px-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{clientName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Supplier: {client.vendor.name}</p>
        </div>

        {/* Cylinders */}
        {appliances.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-400 text-center">
            No appliances registered yet.
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Your cylinders</h2>
            {appliances.map(appliance => {
              const cycle = appliance.cylinderCycles[0];
              const days = cycle ? daysUntil(cycle.predictedEmptyDate) : null;
              const badge = days !== null ? statusBadge(days) : null;
              const applianceLabel = appliance.applianceType;

              return (
                <div key={appliance.id} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        {appliance.cylinderSizeKg}kg cylinder — {applianceLabel}
                      </div>
                      {cycle ? (
                        <div className="text-sm text-gray-500 mt-1">
                          {days !== null && days < 0
                            ? `This cylinder was predicted empty on ${formatDate(cycle.predictedEmptyDate)}`
                            : `Predicted empty: ${formatDate(cycle.predictedEmptyDate)}`}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 mt-1">Cycle not yet started</div>
                      )}
                    </div>
                    {badge && (
                      <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>
                  <DeleteCylinderButton
                    applianceId={appliance.id}
                    clientId={clientId}
                    label={`${appliance.cylinderSizeKg}kg — ${appliance.applianceType}`}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          {hasActiveAppliances && (
            <Link
              href={`/reorder/${clientId}`}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-center font-semibold py-3 rounded-xl transition-colors"
            >
              Order gas now
            </Link>
          )}
          <Link
            href={`/account/${clientId}/add-appliance`}
            className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-center font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            + Add appliance
          </Link>
        </div>

        {/* Edit profile */}
        <EditProfileForm
          clientId={clientId}
          initial={{
            name: clientName,
            email: clientEmail,
            phone: clientPhone,
            notificationPreference: client.notificationPreference,
          }}
        />

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
                    {order.status === "delivered"
                      ? "Delivered"
                      : order.status === "confirmed"
                      ? "Confirmed"
                      : "Processing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Support */}
        <div className="text-center text-xs text-gray-400 pb-4">
          Need help? Call or WhatsApp{" "}
          <a href="tel:+27824993552" className="text-orange-500 font-medium">+27 82 499 3552</a>
        </div>
      </div>
    </div>
  );
}
