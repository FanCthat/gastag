"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notifPref, setNotifPref] = useState("email");

  // Cylinder
  const [selectedAppliances, setSelectedAppliances] = useState<string[]>(["stove"]);
  const [cylinderSize, setCylinderSize] = useState(9);
  const [estimatedMonths, setEstimatedMonths] = useState("");
  const [remainingMonths, setRemainingMonths] = useState("");

  function toggleAppliance(value: string) {
    setSelectedAppliances(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  }

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrCodeId, name, email, phone: phone || null, deliveryAddress: address, notificationPreference: notifPref }),
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
          <Field label="Phone / WhatsApp number" optional>
            <input type="tel" placeholder="e.g. 082 499 3552" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
          </Field>
          <Field label="Delivery address" required>
            <textarea rows={2} required value={address} onChange={e => setAddress(e.target.value)} className={inputCls} />
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
          <h2 className="text-base font-semibold text-gray-800">Your first cylinder</h2>
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

          <Field label="Cylinder size (kg)">
            <select value={cylinderSize} onChange={e => setCylinderSize(parseInt(e.target.value))} className={inputCls}>
              {[3, 5, 7, 9, 14, 19, 48].map(s => (
                <option key={s} value={s}>{s}kg</option>
              ))}
            </select>
          </Field>

          <Field label="How long does a full cylinder usually last you?">
            <input
              type="number"
              required
              min={0.5}
              step={0.5}
              placeholder="e.g. 3"
              value={estimatedMonths}
              onChange={e => setEstimatedMonths(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter months — e.g. 3 = three months, 1.5 = six weeks. Used for reminders after each future delivery.
            </p>
          </Field>

          <Field label="How long until this cylinder runs out?" optional>
            <input
              type="number"
              min={0.5}
              step={0.5}
              placeholder="e.g. 1"
              value={remainingMonths}
              onChange={e => setRemainingMonths(e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              {remainingMonths
                ? `First reminder based on ${remainingMonths} month${parseFloat(remainingMonths) !== 1 ? "s" : ""} remaining.`
                : "If you just had a delivery, leave blank — we'll assume it's full."}
            </p>
          </Field>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading || selectedAppliances.length === 0} className={btnCls}>
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

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400";
const btnCls = "w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors";
