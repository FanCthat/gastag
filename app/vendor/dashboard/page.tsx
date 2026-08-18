import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getVendorDataKey, resolveField, resolveCylinderSize } from "@/lib/client-crypto";
import VendorNav from "./_components/nav";
import PendingOrders from "./_components/pending-orders";
import ClientList from "./_components/client-list";
import BroadcastForm from "./_components/broadcast-form";

export default async function VendorDashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "vendor") redirect("/vendor/login");

  const vendorId = (session.user as any).id as string;
  const { tab = "orders" } = await searchParams;

  const [vendor, pendingOrders, clients] = await Promise.all([
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
      where: { vendorId },
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{vendor?.name}</h1>
          <p className="text-xs text-gray-400">GasTag Supplier Portal</p>
        </div>
        <VendorNav activeTab={tab} pendingCount={pendingOrders.length} />
      </header>

      <div className="p-6">
        {vendor?.isDemo && (
          <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
            <strong>🔬 Demo mode</strong> — You are viewing a demo account. Test clients and orders placed here will be cleared when your account is activated.
          </div>
        )}
        {tab === "orders" && <PendingOrders orders={resolvedOrders} vendorId={vendorId} />}
        {tab === "clients" && <ClientList clients={resolvedClients} encryptionOn={vendor?.encryptionOn ?? false} />}
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
