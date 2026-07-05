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
  isDemo,
}: {
  qrCodeId: string;
  cylinderSizes: number[];
  isDemo: boolean;
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
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">You're all set!</h2>
        <p className="text-sm text-gray-600 max-w-xs mx-auto">
          Your cylinder is registered. You'll receive reminder emails before you run out —
          so you can order in advance and never get caught without gas.
        </p>
        {isDemo && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-sm text-orange-800 text-left">
            <p className="font-bold mb-1">🔬 Demo: what happens now</p>
            <p>Your first reminder email has been sent to your inbox. Check it, read it, then tap <strong>"Receive next demo email"</strong> at the bottom to move through the full reminder sequence.</p>
          </div>
        )}
        <a
          href={`/account/${clientId}`}
          className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          View my account →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-6">

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        <div className={`flex-1 h-1.5 rounded-full ${step === "details" ? "bg-orange-500" : "bg-orange-500"}`} />
        <div className={`flex-1 h-1.5 rounded-full ${step === "appliance" ? "bg-orange-500" : "bg-gray-200"}`} />
        <span className="text-xs text-gray-400 ml-1">
          {step === "details" ? "Step 1 of 2" : "Step 2 of 2"}
        </span>
      </div>

      {step === "details" && (
        <form onSubmit={submitDetails} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Your details</h2>
            <p className="text-xs text-gray-400 mt-0.5">So your supplier knows who you are and where to deliver.</p>
          </div>

          <Field label="Full name" required>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Sarah van der Merwe" />
          </Field>

          <Field label="Email address" required hint="Your reminder emails will arrive here — use an address you check regularly.">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="e.g. sarah@gmail.com" />
          </Field>

          <Field label="Phone / WhatsApp number" optional hint="Optional — only used if your supplier needs to reach you about a delivery.">
            <input type="tel" placeholder="e.g. 082 499 3552" value={phone} onChange={e => setPhone(e.target.value)} className={inputCls} />
          </Field>

          <Field label="Delivery address" required hint="Where should your supplier bring your gas?">
            <textarea rows={2} required value={address} onChange={e => setAddress(e.target.value)} className={inputCls} placeholder="e.g. 12 Main Road, Fourways, Johannesburg" />
          </Field>

          <Field label="How would you like to be reminded?">
            <select value={notifPref} onChange={e => setNotifPref(e.target.value)} className={inputCls}>
              <option value="email">Email only</option>
              <option value="push">Push notifications only</option>
              <option value="both">Both email and push</option>
            </select>
          </Field>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className={btnCls}>
            {loading ? "Saving…" : "Next — cylinder details →"}
          </button>
        </form>
      )}

      {step === "appliance" && (
        <form onSubmit={submitAppliance} className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">About your cylinder</h2>
            <p className="text-xs text-gray-400 mt-0.5">This helps us know when to remind you — so we contact you before you run dry, not after.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What does this cylinder run? <span className="text-red-500">*</span></label>
            <p className="text-xs text-gray-400 mb-2">Tick everything this cylinder supplies — you can pick more than one.</p>
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
              <p className="text-xs text-red-500 mt-1">Please tick at least one.</p>
            )}
          </div>

          <Field label="Cylinder size (kg)" hint="Check the label on the side of your cylinder if you're not sure.">
            <select value={cylinderSize} onChange={e => setCylinderSize(parseInt(e.target.value))} className={inputCls}>
              {[3, 5, 7, 9, 14, 19, 48].map(s => (
                <option key={s} value={s}>{s} kg</option>
              ))}
            </select>
          </Field>

          <Field
            label="How long does a full cylinder usually last you?"
            required
            hint="Enter a number of months. For example: type 3 for three months, or 1.5 for six weeks. We use this to know when to send your reminders."
          >
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
          </Field>

          <Field
            label="How much gas do you think is left right now?"
            optional
            hint="Leave blank if you just had a delivery — we'll assume your cylinder is full. Otherwise, estimate how many months of gas are left."
          >
            <input
              type="number"
              min={0.5}
              step={0.5}
              placeholder="e.g. 1 (meaning about 1 month left)"
              value={remainingMonths}
              onChange={e => setRemainingMonths(e.target.value)}
              className={inputCls}
            />
          </Field>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading || selectedAppliances.length === 0} className={btnCls}>
            {loading ? "Registering…" : "Register my cylinder ✓"}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({
  label, required, optional, hint, children,
}: {
  label: string; required?: boolean; optional?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder:text-gray-400";
const btnCls = "w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors";
