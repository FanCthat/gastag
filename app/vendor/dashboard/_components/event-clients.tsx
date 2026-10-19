"use client";

type EventClient = {
  id: string;
  name: string;
  phone: string | null;
  deliveryAddress: string;
  createdAt: Date;
  hasCylinder: boolean;
};

type EventGroup = {
  tag: string;
  clients: EventClient[];
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function downloadCsv(tag: string, clients: EventClient[], baseUrl: string) {
  const rows = [
    ["Name", "Phone", "Address", "Registered", "Has cylinder", "Add-cylinder link"],
    ...clients.map(c => [
      c.name,
      c.phone ?? "",
      c.deliveryAddress,
      formatDate(c.createdAt),
      c.hasCylinder ? "Yes" : "No",
      `${baseUrl}/account/${c.id}/add-appliance`,
    ]),
  ];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tag}-clients.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function EventClients({
  groups,
  appBaseUrl,
}: {
  groups: EventGroup[];
  appBaseUrl: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        No event-tagged clients yet. Use the <span className="font-mono text-xs">?event=</span> param on a pre-registration URL to tag clients to an event.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map(({ tag, clients }) => {
        const withCylinder = clients.filter(c => c.hasCylinder).length;
        const without = clients.filter(c => !c.hasCylinder);
        const pct = clients.length > 0 ? Math.round((withCylinder / clients.length) * 100) : 0;

        return (
          <div key={tag} className="space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-semibold text-gray-900 font-mono">{tag}</h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {withCylinder} of {clients.length} have added a cylinder ({pct}%)
                </p>
              </div>
              <button
                onClick={() => downloadCsv(tag, clients, appBaseUrl)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Download CSV
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-orange-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>

            {without.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
                All clients have added a cylinder. Nothing to chase.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                  <p className="text-xs font-semibold text-amber-800">{without.length} still need to add a cylinder</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Address</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Registered</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600">Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {without.map(c => (
                      <tr key={c.id}>
                        <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{c.deliveryAddress}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{formatDate(c.createdAt)}</td>
                        <td className="px-4 py-3">
                          <a
                            href={`${appBaseUrl}/account/${c.id}/add-appliance`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-orange-600 hover:underline font-medium"
                          >
                            Add cylinder →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
