import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { verifyAdminCookie } from "@/lib/admin-pins";
import ScanPreRegisterForm from "./_form";

export default async function ScanPreRegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const cookieStore = await cookies();
  const cookie = cookieStore.get(`gastag_admin_${id}`)?.value ?? null;

  if (!cookie) redirect(`/scan/${id}`);

  const check = verifyAdminCookie(cookie, id);
  if (!check.valid) redirect(`/scan/${id}`);

  const qr = await prisma.qRCode.findUnique({
    where: { id },
    select: { id: true, state: true, vendor: { select: { name: true } } },
  });
  if (!qr) notFound();

  if (qr.state !== "unregistered") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-sm text-center space-y-3">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-lg font-bold text-gray-900">Tag not available</h2>
          <p className="text-sm text-gray-500">
            This tag is already registered or has been replaced. Check the client list in the dashboard.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div>
          <h1 className="text-base font-bold text-gray-900">Pre-register a client</h1>
          <p className="text-xs text-gray-500">{qr.vendor.name} · Tag: <span className="font-mono">{id}</span></p>
        </div>
      </header>
      <div className="px-4 pb-12">
        <ScanPreRegisterForm qrCodeId={id} />
      </div>
    </div>
  );
}
