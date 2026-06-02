import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import RegisterForm from "./_form";

export default async function RegisterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qRCode.findUnique({
    where: { id },
    include: { vendor: { select: { name: true } } },
  });

  if (!qr || qr.state === "registered") notFound();

  const cylinderSizes = [3, 5, 7, 9, 14, 19, 48];

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Register your cylinder</h1>
          <p className="text-sm text-gray-500 mt-1">Supplier: <span className="font-medium">{qr.vendor.name}</span></p>
        </div>
        <RegisterForm qrCodeId={id} cylinderSizes={cylinderSizes} />
      </div>
    </div>
  );
}
