import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import Link from "next/link";
import AdminPinSection from "./_admin-pin-section";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qRCode.findUnique({ where: { id }, include: { client: true, vendor: { select: { name: true } } } });

  if (!qr) notFound();

  if (qr.state === "replaced") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm text-center">
          <div className="text-4xl mb-4">🔄</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">This tag has been replaced</h2>
          <p className="text-sm text-gray-500">Please use your new GasTag keyring tag to access your account.</p>
        </div>
      </div>
    );
  }

  if (qr.state === "registered" && qr.client && !qr.client.suppressedAt) {
    redirect(`/account/${qr.client.id}`);
  }

  if (qr.state === "pre_registered" && qr.client && !qr.client.suppressedAt) {
    redirect(`/confirm/${qr.client.id}`);
  }

  // Unregistered — show landing page with customer and admin paths
  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center px-4 pt-16 pb-12">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-1">
            <span className="text-white text-2xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">GasTag keyring</h1>
          <p className="text-sm text-gray-500">
            Supplied by <span className="font-medium text-gray-700">{qr.vendor.name}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Is this keyring yours?</p>
            <p className="text-xs text-gray-500 mt-1">
              Register it in two minutes. We'll remind you before your gas runs out so you never get caught empty.
            </p>
          </div>
          <Link
            href={`/register/${id}`}
            className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
          >
            Register my keyring
          </Link>
        </div>

        <AdminPinSection qrCodeId={id} />

      </div>
    </div>
  );
}
