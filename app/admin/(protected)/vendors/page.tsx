import { prisma } from "@/lib/db";
import Link from "next/link";

export default async function VendorsPage() {
  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { clients: true, qrCodes: true } },
    },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <Link
          href="/admin/vendors/new"
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + Add vendor
        </Link>
      </div>

      {vendors.length === 0 ? (
        <div className="text-gray-400 text-sm">No vendors yet.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Business</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Region</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">QR codes</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Clients</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {vendors.map((v: typeof vendors[number]) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div>{v.contactName}</div>
                    <div className="text-xs text-gray-400">{v.contactEmail}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{v.region || "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{v._count.qrCodes}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{v._count.clients}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                        v.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {v.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/vendors/${v.id}`}
                      className="text-orange-500 hover:text-orange-600 font-medium"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
