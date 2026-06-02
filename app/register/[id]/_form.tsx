"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDurationWarning } from "@/lib/prediction";

const APPLIANCE_TYPES = [
  { value: "stove", label: "Stove / Hob" },
  { value: "geyser", label: "Gas geyser" },
  { value: "braai", label: "Braai / BBQ" },
  { value: "patio_heater", label: "Patio heater" },
  { value: "other", label: "Other" },
];

export default function RegisterForm({
  qrCodeId,
  cylinderSizes,
}: {
  qrCodeId: string;
  cylinderSizes: number[];
}) {
  const router = useRouter();
  const [step, setStep] = useState<"details" | "appliance" | "done">("details");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState("");

  // Client details
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notifPref, setNotifPref] = useState("email");

  // Appliance
  const [applianceType, setApplianceType] = useState("stove");
  const [cylinderSize, setCylinderSize] = useState(9);
  const [estimatedMonths, setEstimatedMonths] = useState("");
  const durationWarning =
    estimatedMonths && !isNaN(parseFloat(estimatedMonths))
      ? getDurationWarning(cylinderSize, parseFloat(estimatedMonths))
      : null;

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodeId, name, email, deliveryAddress: address, notificationPreference: notifPref }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setClientId(data.clientId);
      setStep("appliance");
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
    }
  }

  async function submitAppliance(e: React.FormEvent) {
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
      setStep("done");
    } else {
      const data = await res.json();
      setError(data.error || "Something went wrong.");
    }
  }

  if (step === "done") {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">You're registered!</h2>
        <p className="text-sm text-gray-500 mb-6">
          We'll remind you before your cylinder runs out. You can manage everything from your account.
        </p>
        <a
          href={`/account/${clientId}`}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          Go to my account →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">
      {step === "details" && (
        <form onSubmit={submitDetails} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Your details</h2>
          <Field label="Full name" required>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Email address" required>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Delivery address">
            <textarea
              rows={2}
              required
              value={address}
              onChange={e => setAddress(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="How would you like to be notified?">
            <select value={notifPref} onChange={e => setNotifPref(e.target.value)} className={inputCls}>
              <option value="email">Email only</option>
              <option value="push">Push notifications only</option>
              <option value="both">Both email and push</option>
            </select>
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "Saving…" : "Next →"}
          </button>
        </form>
      )}

      {step === "appliance" && (
        <form onSubmit={submitAppliance} className="space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Your appliance</h2>
          <Field label="What does the gas run?">
            <select value={applianceType} onChange={e => setApplianceType(e.target.value)} className={inputCls}>
              {APPLIANCE_TYPES.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Cylinder size (kg)">
            <select
              value={cylinderSize}
              onChange={e => setCylinderSize(parseInt(e.target.value))}
              className={inputCls}
            >
              {[3, 5, 7, 9, 14, 19, 48].map(s => (
                <option key={s} value={s}>{s}kg</option>
              ))}
            </select>
          </Field>
          <Field label="How long does a cylinder usually last for you? (months)" optional>
            <input
              type="number"
              min={0.5}
              step={0.5}
              placeholder="e.g. 3"
              value={estimatedMonths}
              onChange={e => setEstimatedMonths(e.target.value)}
              className={inputCls}
            />
            {durationWarning && (
              <p className="text-xs text-amber-600 mt-1">{durationWarning}</p>
            )}
            {!estimatedMonths && (
              <p className="text-xs text-gray-400 mt-1">Leave blank to use the industry average.</p>
            )}
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "Saving…" : "Register cylinder"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, required, optional, children }: { label: string; required?: boolean; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {optional && <span className="text-gray-400 ml-1">(optional)</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";
const btnCls = "w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors";
