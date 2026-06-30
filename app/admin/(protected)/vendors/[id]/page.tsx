import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import VendorDetailClient from "./_client";
import ReplaceQR from "./_components/replace-qr";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: {
      id: true, name: true, contactName: true, contactEmail: true, contactEmail2: true,
      region: true, isActive: true, logoUrl: true, whatsapp: true, updatedAt: true, createdAt: true,
      _count: { select: { clients: true, qrCodes: true, orders: true } },
    },
  });
  if (!vendor) notFound();

  const [unregisteredCount, clients, unregisteredQRs] = await Promise.all([
    prisma.qRCode.count({ where: { vendorId: id, state: "unregistered" } }),
    prisma.client.findMany({ where: { vendorId: id }, select: { id: true, name: true, email: true }, orderBy: { createdAt: "asc" } }),
    prisma.qRCode.findMany({ where: { vendorId: id, state: "unregistered" }, select: { id: true }, take: 100 }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{vendor.name}</h1>
      <p className="text-sm text-gray-500 mb-6">{vendor.contactEmail}</p>
      <VendorDetailClient vendor={{ ...vendor, unregisteredQrCodes: unregisteredCount }} />
      <div className="mt-6">
        <ReplaceQR clients={clients} unregisteredQRs={unregisteredQRs} />
      </div>
    </div>
  );
}
