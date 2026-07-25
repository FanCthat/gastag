import RecordDeliveryButton from "./record-delivery-button";

type Appliance = {
  id: string;
  applianceType: string;
  cylinderSizeKg: number;
  cylinderCycles: { predictedEmptyDate: Date; status: string }[];
};

type Client = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  deliveryAddress: string;
  createdAt: Date;
  appliances: Appliance[];
};

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

function daysUntil(d: Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getNextCycle(client: Client) {
  return client.appliances
    .flatMap(a => a.cylinderCycles)
    .sort((a, b) => new Date(a.predictedEmptyDate).getTime() - new Date(b.predictedEmptyDate).getTime())[0];
}

export default function ClientList({ clients }: { clients: Client[] }) {
  if (clients.length === 0) {
    return <div className="text-center py-16 text-gray-400 text-sm">No registered clients yet.</div>;
  }

  // Sort: overdue first (most overdue at top), then soonest-due, then fine, then no cycle.
  const sorted = [...clients].sort((a, b) => {
    const ca = getNextCycle(a);
    const cb = getNextCycle(b);
    const dA = ca ? daysUntil(ca.predictedEmptyDate) : null;
    const dB = cb ? daysUntil(cb.predictedEmptyDate) : null;
    if (dA === null && dB === null) return 0;
    if (dA === null) return 1;
    if (dB === null) return -1;
    return dA - dB;
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Appliances</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Next empty date</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Delivery address</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((c: Client) => {
            const incomplete = c.appliances.length === 0;
            const nextCycle = getNextCycle(c);
            const days = nextCycle ? daysUntil(nextCycle.predictedEmptyDate) : null;
            const isOverdue = days !== null && days <= 0;

            return (
              <tr
                key={c.id}
                className={
                  isOverdue ? "bg-red-50" :
                  incomplete ? "bg-amber-50" : ""
                }
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">{c.name}</div>
                  <div className="text-xs text-gray-400">{c.email}</div>
                  {c.phone && (
                    <a
                      href={`https://wa.me/${c.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-green-600 hover:underline"
                    >
                      {c.phone}
                    </a>
                  )}
                  {incomplete && (
                    <div className="text-xs text-amber-700 font-medium mt-0.5">Did not finish registering</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {c.appliances.length === 0 ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    c.appliances.map(a => (
                      <div key={a.id}>{a.cylinderSizeKg}kg {a.applianceType}</div>
                    ))
                  )}
                </td>
                <td className="px-4 py-3">
                  {nextCycle ? (
                    <div>
                      <div className={isOverdue || (days !== null && days <= 21) ? "text-red-600 font-medium" : "text-gray-700"}>
                        {formatDate(nextCycle.predictedEmptyDate)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {days !== null && (days <= 0 ? "Overdue" : `${days}d`)}
                      </div>
                      {isOverdue && <RecordDeliveryButton clientId={c.id} />}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{c.deliveryAddress}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
