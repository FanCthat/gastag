import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qRCode.findUnique({ where: { id }, include: { client: true } });

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

  redirect(`/register/${id}`);
}
