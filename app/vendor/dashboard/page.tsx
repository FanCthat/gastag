import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import VendorNav from "./_components/nav";
import PendingOrders from "./_components/pending-orders";
import ClientList from "./_components/client-list";

export default async function VendorDashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "vendor") redirect("/vendor/login");

  const vendorId = (session.user as any).id as string;
  const { tab = "orders" } = await searchParams;

  const [vendor, pendingOrders, clients] = await Promise.all([
    prisma.vendor.findUnique({ where: { id: vendorId }, select: { name: true } }),
    prisma.order.findMany({
      where: { vendorId, status: "pending" },
      orderBy: { placedAt: "desc" },
      include: {
        client: { select: { name: true, email: true, deliveryAddress: true } },
        orderItems: {
          include: {
            appliance: { select: { applianceType: true, cylinderSizeKg: true } },
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
        {tab === "orders" && <PendingOrders orders={pendingOrders} vendorId={vendorId} />}
        {tab === "clients" && <ClientList clients={clients} />}
      </div>
    </div>
  );
}
