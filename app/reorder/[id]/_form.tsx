"use client";

import { useState } from "react";

type Appliance = {
  id: string;
  applianceType: string;
  cylinderSizeKg: number;
  cylinderCycles: { id: string; predictedEmptyDate: Date }[];
};

type Client = {
  id: string;
  name: string;
  deliveryAddress: string;
  appliances: Appliance[];
};

export default function ReorderForm({ client }: { client: Client }) {
  const [address, setAddress] = useState(client.deliveryAddress);
  const [permanent, setPermanent] = useState(false);
  const [selected, setSelected] = useState<string[]>(client.appliances.map(a => a.id));
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (selected.length === 0) { setError("Select at least one cylinder."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        applianceIds: selected,
        deliveryAddress: address,
        addressIsPermanentChange: permanent,
      }),
    });
    setLoading(false);
    if (res.ok) setDone(true);
    else { const d = await res.json(); setError(d.error || "Something went wrong."); }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Order received!</h2>
        <p className="text-sm text-gray-500 mb-6">Your supplier will be in touch to confirm delivery.</p>
        <a
          href={`/account/${client.id}`}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          View my account →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Which cylinders?</h3>
        {client.appliances.length === 0 ? (
          <p className="text-sm text-gray-400">No active appliances registered.</p>
        ) : (
          <div className="space-y-2">
            {client.appliances.map(a => (
              <label key={a.id} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(a.id)}
                  onChange={() => toggle(a.id)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">
                  {a.cylinderSizeKg}kg — {a.applianceType}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery address</label>
        <textarea
          rows={2}
          required
          value={address}
          onChange={e => setAddress(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input type="checkbox" checked={permanent} onChange={e => setPermanent(e.target.checked)} className="rounded" />
          <span className="text-xs text-gray-500">Save as my new default address</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {loading ? "Placing order…" : "Place order"}
      </button>
    </form>
  );
}
