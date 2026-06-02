import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import ReorderForm from "./_form";

export default async function ReorderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vendor: { select: { name: true } },
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

  if (!client) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Order gas</h1>
          <p className="text-sm text-gray-500 mt-1">Hi {client.name} — confirm your order below.</p>
        </div>
        <ReorderForm client={client as any} />
      </div>
    </div>
  );
}
