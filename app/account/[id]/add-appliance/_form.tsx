"use client";

import { useState } from "react";
import { getDurationWarning } from "@/lib/prediction";

const APPLIANCE_TYPES = [
  { value: "stove", label: "Stove / Hob" },
  { value: "geyser", label: "Gas geyser" },
  { value: "braai", label: "Braai / BBQ" },
  { value: "patio_heater", label: "Patio heater" },
  { value: "other", label: "Other" },
];

export default function AddApplianceForm({ clientId }: { clientId: string }) {
  const [applianceType, setApplianceType] = useState("stove");
  const [cylinderSize, setCylinderSize] = useState(9);
  const [estimatedMonths, setEstimatedMonths] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const durationWarning =
    estimatedMonths && !isNaN(parseFloat(estimatedMonths))
      ? getDurationWarning(cylinderSize, parseFloat(estimatedMonths))
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register/appliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        applianceType,
        cylinderSizeKg: cylinderSize,
        clientEstimatedDurationMonths: estimatedMonths ? parseFloat(estimatedMonths) : null,
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
        <h2 className="text-xl font-bold text-gray-900 mb-2">Appliance added!</h2>
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">What does the gas run?</label>
        <select
          value={applianceType}
          onChange={e => setApplianceType(e.target.value)}
          className={cls}
        >
          {APPLIANCE_TYPES.map(a => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cylinder size (kg)</label>
        <select
          value={cylinderSize}
          onChange={e => setCylinderSize(parseInt(e.target.value))}
          className={cls}
        >
          {[3, 5, 7, 9, 14, 19, 48].map(s => (
            <option key={s} value={s}>{s}kg</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          How many months does a full cylinder last you? <span className="text-gray-400">(optional)</span>
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
        {durationWarning && <p className="text-xs text-amber-600 mt-1">{durationWarning}</p>}
        <p className="text-xs text-gray-400 mt-1">
          {estimatedMonths
            ? `${estimatedMonths} month${parseFloat(estimatedMonths) !== 1 ? "s" : ""} — we'll remind you before then.`
            : "Enter a number of months (e.g. 3 = three months, 1.5 = six weeks). Leave blank to use the industry average."}
        </p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors">
        {loading ? "Saving…" : "Add appliance"}
      </button>
      <a href={`/account/${clientId}`} className="block text-center text-sm text-gray-400 hover:text-gray-600">
        Cancel
      </a>
    </form>
  );
}

const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";
