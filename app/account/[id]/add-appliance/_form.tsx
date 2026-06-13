"use client";

import { useState } from "react";

const APPLIANCE_OPTIONS = [
  { value: "stove", label: "Stove / Hob" },
  { value: "geyser", label: "Gas geyser" },
  { value: "braai", label: "Braai / BBQ" },
  { value: "patio_heater", label: "Patio heater" },
  { value: "other", label: "Other" },
];

function buildApplianceLabel(selected: string[]): string {
  return selected
    .map(v => APPLIANCE_OPTIONS.find(a => a.value === v)?.label ?? v)
    .join(" + ");
}

export default function AddApplianceForm({ clientId }: { clientId: string }) {
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>(["stove"]);
  const [cylinderSize, setCylinderSize] = useState(9);
  const [estimatedMonths, setEstimatedMonths] = useState("");
  const [remainingMonths, setRemainingMonths] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  function toggleAppliance(value: string) {
    setSelectedAppliances(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedAppliances.length === 0) {
      setError("Please select at least one appliance this cylinder runs.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/register/appliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        applianceType: buildApplianceLabel(selectedAppliances),
        cylinderSizeKg: cylinderSize,
        clientEstimatedDurationMonths: estimatedMonths ? parseFloat(estimatedMonths) : null,
        currentRemainingMonths: remainingMonths ? parseFloat(remainingMonths) : null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json();
      setError(d.error || "Something went wrong.");
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Cylinder added!</h2>
        <p className="text-sm text-gray-500 mb-6">We'll remind you before this cylinder runs out too.</p>
        <a
          href={`/account/${clientId}`}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Back to my account →
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Add a cylinder</h2>
      <p className="text-xs text-gray-500">One cylinder can run multiple appliances — tick everything this cylinder supplies.</p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">What does this cylinder run?</label>
        <div className="space-y-2">
          {APPLIANCE_OPTIONS.map(a => (
            <label key={a.value} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedAppliances.includes(a.value)}
                onChange={() => toggleAppliance(a.value)}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-gray-800">{a.label}</span>
            </label>
          ))}
        </div>
        {selectedAppliances.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Select at least one.</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cylinder size (kg)</label>
        <select value={cylinderSize} onChange={e => setCylinderSize(parseInt(e.target.value))} className={cls}>
          {[3, 5, 7, 9, 14, 19, 48].map(s => (
            <option key={s} value={s}>{s}kg</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How long does a full cylinder usually last you? <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="number"
          min={0.5}
          step={0.5}
          placeholder="e.g. 3"
          value={estimatedMonths}
          onChange={e => setEstimatedMonths(e.target.value)}
          className={cls}
        />
        <p className="text-xs text-gray-400 mt-1">
          Enter months — e.g. 3 = three months, 1.5 = six weeks. Used for reminders after each future delivery.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How long until this cylinder runs out? <span className="text-gray-400">(optional)</span>
        </label>
        <input
          type="number"
          min={0.1}
          step={0.5}
          placeholder="e.g. 1"
          value={remainingMonths}
          onChange={e => setRemainingMonths(e.target.value)}
          className={cls}
        />
        <p className="text-xs text-gray-400 mt-1">
          {remainingMonths
            ? `First reminder based on ${remainingMonths} month${parseFloat(remainingMonths) !== 1 ? "s" : ""} remaining.`
            : "If you just had a delivery, leave blank — we'll assume it's full."}
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || selectedAppliances.length === 0}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors"
      >
        {loading ? "Saving…" : "Add cylinder"}
      </button>
      <a href={`/account/${clientId}`} className="block text-center text-sm text-gray-400 hover:text-gray-600">
        Cancel
      </a>
    </form>
  );
}

const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";
