import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import VendorDetailClient from "./_client";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      _count: { select: { clients: true, qrCodes: true, orders: true } },
    },
  });
  if (!vendor) notFound();

  const unregistered = await prisma.qRCode.count({ where: { vendorId: id, state: "unregistered" } });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{vendor.name}</h1>
      <p className="text-sm text-gray-500 mb-6">{vendor.contactEmail}</p>
      <VendorDetailClient vendor={{ ...vendor, unregisteredQrCodes: unregistered }} />
    </div>
  );
}
