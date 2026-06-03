import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import AddApplianceForm from "./_form";

export default async function AddAppliancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true },
  });
  if (!client) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-10 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Add another appliance</h1>
          <p className="text-sm text-gray-500 mt-1">Hi {client.name} — tell us about your next gas appliance.</p>
        </div>
        <AddApplianceForm clientId={clientId} />
      </div>
    </div>
  );
}
