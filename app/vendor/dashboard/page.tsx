import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getVendorDataKey, resolveField, resolveCylinderSize } from "@/lib/client-crypto";
import VendorNav from "./_components/nav";
import PendingOrders from "./_components/pending-orders";
import ClientList from "./_components/client-list";
import BroadcastForm from "./_components/broadcast-form";
import RemovalRequestsBanner from "./_components/removal-requests-banner";
import EventClients from "./_components/event-clients";

export default async function VendorDashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "vendor") redirect("/vendor/login");

  const vendorId = (session.user as any).id as string;
  const { tab = "orders" } = await searchParams;

  const [vendor, pendingOrders, clients, removalRequests, eventClients] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true, logoUrl: true, isDemo: true, encryptionOn: true, wrappedDataKey: true } }),
    prisma.order.findMany({
      where: { vendorId, status: "pending" },
      orderBy: { placedAt: "desc" },
      include: {
        client: { select: { name: true, nameEnc: true, email: true, emailEnc: true, phone: true, phoneEnc: true, deliveryAddress: true, deliveryAddressEnc: true } },
        orderItems: {
          include: {
            appliance: { select: { applianceType: true, cylinderSizeKg: true, cylinderSizeEnc: true } },
          },
        },
      },
    }),
    prisma.client.findMany({
      where: { vendorId, suppressedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        appliances: {
          where: { isActive: true },
          include: {
            cylinderCycles: {
              where: { status: "active" },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.client.findMany({
      where: { vendorId, removalRequestedAt: { not: null }, suppressedAt: null },
      select: {
        id: true,
        name: true, nameEnc: true,
        removalRequestedAt: true,
      },
      orderBy: { removalRequestedAt: "asc" },
    }),
    prisma.client.findMany({
      where: { vendorId, suppressedAt: null, sourceTag: { not: null } },
      select: {
        id: true,
        name: true, nameEnc: true,
        phone: true, phoneEnc: true,
        deliveryAddress: true, deliveryAddressEnc: true,
        sourceTag: true,
        createdAt: true,
        appliances: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const dataKey = (vendor?.encryptionOn && vendor?.wrappedDataKey)
    ? getVendorDataKey(vendor.wrappedDataKey)
    : null;

  const resolvedOrders = pendingOrders.map(order => ({
    ...order,
    client: {
      ...order.client,
      name:            resolveField(order.client.nameEnc,            order.client.name,            dataKey),
      email:           resolveField(order.client.emailEnc,           order.client.email,           dataKey),
      phone:           order.client.phoneEnc
                         ? resolveField(order.client.phoneEnc, order.client.phone, dataKey)
                         : (order.client.phone ?? null),
      deliveryAddress: resolveField(order.client.deliveryAddressEnc, order.client.deliveryAddress, dataKey),
    },
    orderItems: order.orderItems.map(item => ({
      ...item,
      appliance: {
        ...item.appliance,
        cylinderSizeKg: resolveCylinderSize(item.appliance.cylinderSizeKg, item.appliance.cylinderSizeEnc, dataKey),
      },
    })),
  }));

  const resolvedClients = clients.map(client => ({
    ...client,
    name:            resolveField(client.nameEnc,            client.name,            dataKey),
    email:           resolveField(client.emailEnc,           client.email,           dataKey),
    phone:           client.phoneEnc
                       ? resolveField(client.phoneEnc, client.phone, dataKey)
                       : (client.phone ?? null),
    deliveryAddress: resolveField(client.deliveryAddressEnc, client.deliveryAddress, dataKey),
    appliances: client.appliances.map(a => ({
      ...a,
      cylinderSizeKg: resolveCylinderSize(a.cylinderSizeKg, a.cylinderSizeEnc ?? null, dataKey),
    })),
  }));

  const resolvedRemovalRequests = removalRequests.map(c => ({
    id: c.id,
    displayName: resolveField(c.nameEnc, c.name, dataKey) || "Unknown client",
    requestedAt: c.removalRequestedAt!.toISOString(),
  }));

  // Group event clients by sourceTag for the Events tab
  const eventGroupMap = new Map<string, typeof eventClients>();
  for (const c of eventClients) {
    const tag = c.sourceTag!;
    if (!eventGroupMap.has(tag)) eventGroupMap.set(tag, []);
    eventGroupMap.get(tag)!.push(c);
  }
  const resolvedEventGroups = Array.from(eventGroupMap.entries()).map(([tag, cs]) => ({
    tag,
    clients: cs.map(c => ({
      id: c.id,
      name: resolveField(c.nameEnc, c.name, dataKey),
      phone: c.phoneEnc ? resolveField(c.phoneEnc, c.phone, dataKey) : (c.phone ?? null),
      deliveryAddress: resolveField(c.deliveryAddressEnc, c.deliveryAddress, dataKey),
      createdAt: c.createdAt,
      hasCylinder: c.appliances.length > 0,
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-gray-900 truncate">{vendor?.name}</h1>
            <p className="text-xs text-gray-400">GasTag Supplier Portal</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 justify-end shrink-0">
            <VendorNav activeTab={tab} pendingCount={pendingOrders.length} />
          </div>
        </div>
      </header>

      <div className="p-6">
        <RemovalRequestsBanner clients={resolvedRemovalRequests} />
        {vendor?.isDemo && (
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <strong>🔬 Demo mode</strong> — You are viewing a demo account. Test clients and orders placed here will be cleared when your account is activated.
          </div>
        )}
        {tab === "orders" && <PendingOrders orders={resolvedOrders} vendorId={vendorId} />}
        {tab === "clients" && <ClientList clients={resolvedClients} encryptionOn={vendor?.encryptionOn ?? false} />}
        {tab === "events" && (
          <EventClients
            groups={resolvedEventGroups}
            appBaseUrl={process.env.APP_BASE_URL ?? ""}
          />
        )}
        {tab === "specials" && (
          <BroadcastForm
            clients={resolvedClients.map(c => ({ id: c.id, name: c.name, email: c.email }))}
            vendorName={vendor?.name ?? ""}
          />
        )}
      </div>
    </div>
  );
}
