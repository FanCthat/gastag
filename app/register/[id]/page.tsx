import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import RegisterForm from "./_form";

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qRCode.findUnique({
    where: { id },
    include: { vendor: { select: { name: true, isDemo: true } }, client: { select: { id: true } } },
  });

  if (!qr) notFound();

  // Already registered — send them to their account
  if (qr.state === "registered" && qr.client) redirect(`/account/${qr.client.id}`);

  if (qr.state !== "unregistered") notFound();

  const cylinderSizes = [3, 5, 7, 9, 14, 19, 48];

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 bg-orange-500 rounded-xl mb-3">
            <span className="text-white text-base font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Register your cylinder</h1>
          <p className="text-sm text-gray-500 mt-1">
            Supplied by <span className="font-medium text-gray-700">{qr.vendor.name}</span>
          </p>
          <p className="text-xs text-gray-400 mt-2 max-w-xs mx-auto">
            Takes about 2 minutes. Once done, we'll remind you before your gas runs out so you never get caught empty.
          </p>
        </div>
        {qr.vendor.isDemo && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 mb-4 text-center">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-0.5">🔬 Demo mode</p>
            <p className="text-xs text-orange-600">
              You're playing the role of a customer right now. Fill in realistic details — use a real email address so you can receive the demo reminder emails.
            </p>
          </div>
        )}
        <RegisterForm qrCodeId={id} cylinderSizes={cylinderSizes} isDemo={qr.vendor.isDemo} />
      </div>
    </div>
  );
}
