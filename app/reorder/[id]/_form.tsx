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

type FulfilmentType = "delivery" | "collection";

export default function ReorderForm({ client, vendorWhatsapp }: { client: Client; vendorWhatsapp: string | null }) {
  const [fulfilmentType, setFulfilmentType] = useState<FulfilmentType>("delivery");
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
    if (fulfilmentType === "delivery" && !address.trim()) { setError("Please enter a delivery address."); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId: client.id,
        applianceIds: selected,
        fulfilmentType,
        deliveryAddress: fulfilmentType === "delivery" ? address : null,
        addressIsPermanentChange: fulfilmentType === "delivery" ? permanent : false,
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
        <p className="text-sm text-gray-500 mb-6">
          {fulfilmentType === "collection"
            ? "Bring your cylinder(s) in at your convenience — your supplier will confirm once refilled."
            : "Your supplier will be in touch to confirm delivery."}
        </p>
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
        <h3 className="text-sm font-semibold text-gray-800 mb-2">How would you like to receive your gas?</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setFulfilmentType("delivery")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors ${
              fulfilmentType === "delivery"
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl">🚚</span>
            <span>Home Delivery</span>
          </button>
          <button
            type="button"
            onClick={() => setFulfilmentType("collection")}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-4 text-sm font-medium transition-colors ${
              fulfilmentType === "collection"
                ? "border-orange-500 bg-orange-50 text-orange-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className="text-2xl">🏪</span>
            <span>In-Store Collection / Refill</span>
          </button>
        </div>
      </div>

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

      {fulfilmentType === "delivery" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Delivery address</label>
          <textarea
            rows={2}
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={permanent} onChange={e => setPermanent(e.target.checked)} className="rounded" />
            <span className="text-xs text-gray-500">Save as my new default address</span>
          </label>
        </div>
      )}

      {fulfilmentType === "collection" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
          Bring your cylinder(s) to the store. Your supplier will process the refill and confirm once done.
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {loading ? "Placing order…" : "Place order"}
      </button>

      {vendorWhatsapp && (() => {
        const cylinderList = client.appliances
          .filter(a => selected.includes(a.id))
          .map(a => `${a.cylinderSizeKg}kg (${a.applianceType})`)
          .join(", ");
        const waText = encodeURIComponent(
          `Hi, I'd like to bring my cylinder(s) in for a refill.\nName: ${client.name}\nCylinders: ${cylinderList || "see my account"}\nSpecial instructions: `
        );
        return (
          <a
            href={`https://wa.me/${vendorWhatsapp.replace(/\D/g, "")}?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 border border-gray-300 hover:border-gray-400 text-gray-700 rounded-lg py-2.5 text-sm font-semibold transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#25D366]"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.549 4.107 1.51 5.836L0 24l6.335-1.652A11.954 11.954 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.006-1.37l-.36-.214-3.724.977.993-3.63-.235-.374A9.818 9.818 0 1112 21.818z"/></svg>
            Bring in for refill
          </a>
        );
      })()}
    </form>
  );
}
