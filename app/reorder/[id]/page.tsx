import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import ReorderForm from "./_form";

export default async function ReorderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vendor: { select: { name: true, whatsapp: true } },
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
  });

  if (!client || client.suppressedAt) notFound();

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`gastag_device_${clientId}`)?.value ?? null;
  const trusted = !!(client.deviceToken && cookieToken === client.deviceToken);

  if (!trusted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-sm mx-auto text-center space-y-6 pt-16 pb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900">Order gas</h1>
            <p className="text-sm text-gray-500">
              To place an order, we first need to confirm this is your keyring.
            </p>
          </div>
          <Link
            href={`/confirm/${clientId}?return=/reorder/${clientId}`}
            className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Verify and continue to order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Order gas</h1>
          <p className="text-sm text-gray-500 mt-1">Hi {client.name} — confirm your order below.</p>
        </div>
        <ReorderForm client={client as any} vendorWhatsapp={(client.vendor as any)?.whatsapp ?? null} />
      </div>
    </div>
  );
}
