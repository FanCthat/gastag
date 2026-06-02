import { prisma } from "@/lib/db";

export default async function QRCodesPage() {
  const summary = await prisma.vendor.findMany({
    where: { qrCodes: { some: {} } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      _count: { select: { qrCodes: true } },
      qrCodes: {
        where: { state: "unregistered" },
        select: { id: true },
      },
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">QR Codes</h1>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Total codes</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Unregistered</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {summary.map((v: typeof summary[number]) => {
              const unregistered = v.qrCodes.length;
              const registered = v._count.qrCodes - unregistered;
              return (
                <tr key={v.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{v._count.qrCodes}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{unregistered}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{registered}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {summary.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">No QR codes generated yet.</div>
        )}
      </div>
    </div>
  );
}
