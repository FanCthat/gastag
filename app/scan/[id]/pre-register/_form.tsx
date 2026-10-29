"use client";

import { useState, useEffect } from "react";

const APPLIANCE_OPTIONS = [
  { value: "stove", label: "Stove / Hob" },
  { value: "geyser", label: "Geyser" },
  { value: "braai", label: "Braai" },
  { value: "patio_heater", label: "Patio heater" },
  { value: "other", label: "Other" },
];

const CYLINDER_SIZES = [3, 5, 7, 9, 14, 19, 48];
const LS_EVENT_KEY = "gastag_event_tag";
const LS_DEVICE_TOKEN_KEY = "gastag_admin_device_token";

export default function ScanPreRegisterForm({
  qrCodeId,
  initialEvent,
}: {
  qrCodeId: string;
  initialEvent?: string;
}) {
  function lockDevice() {
    localStorage.removeItem(LS_DEVICE_TOKEN_KEY);
    window.location.href = `/scan/${qrCodeId}`;
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  const [addCylinder, setAddCylinder] = useState(false);
  const [applianceType, setApplianceType] = useState("stove");
  const [cylinderSizeKg, setCylinderSizeKg] = useState("9");

  const [predictionBasis, setPredictionBasis] = useState<"measured" | "estimate" | "industry">("measured");
  const [lastPurchaseDate, setLastPurchaseDate] = useState("");
  const [previousPurchaseDate, setPreviousPurchaseDate] = useState("");
  const [estimateMonths, setEstimateMonths] = useState("");

  const [eventTag, setEventTag] = useState(initialEvent ?? "");

  // Seed event tag from localStorage (persists across scans on the same device)
  useEffect(() => {
    if (!initialEvent) {
      const stored = localStorage.getItem(LS_EVENT_KEY);
      if (stored) setEventTag(stored);
    } else {
      // URL param takes priority — save it so future scans on this device auto-fill
      localStorage.setItem(LS_EVENT_KEY, initialEvent);
    }
  }, [initialEvent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (addCylinder) {
      if (predictionBasis === "measured" && !previousPurchaseDate) {
        setError("Please enter the previous purchase date for measured prediction.");
        return;
      }
      if (predictionBasis === "estimate" && !estimateMonths) {
        setError("Please enter your estimate in months.");
        return;
      }
    }

    // Persist the event tag on the device for subsequent registrations
    if (eventTag.trim()) {
      localStorage.setItem(LS_EVENT_KEY, eventTag.trim());
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin-pin/${qrCodeId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          email: email || null,
          deliveryAddress,
          applianceType: addCylinder ? applianceType : undefined,
          cylinderSizeKg: addCylinder ? Number(cylinderSizeKg) : undefined,
          predictionBasis: addCylinder ? predictionBasis : undefined,
          lastPurchaseDate: addCylinder ? (lastPurchaseDate || null) : undefined,
          previousPurchaseDate: addCylinder ? (previousPurchaseDate || null) : undefined,
          estimateMonths: addCylinder && estimateMonths ? Number(estimateMonths) : undefined,
          sourceTag: eventTag.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 401 || res.status === 403) {
        setError("Admin session expired. Please go back and enter your PIN again.");
        return;
      }
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      setSuccess(true);
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900">Client registered</h2>
        <p className="text-sm text-gray-500">
          {addCylinder
            ? "The profile is live and reminders are scheduled. Place this tag in the client's delivery pack."
            : "The profile is live. The client will add their cylinder when they scan their tag."}
        </p>
        <p className="text-xs text-gray-400">You can close this page.</p>
        <button
          type="button"
          onClick={lockDevice}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Lock admin on this device
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto mt-6 space-y-6">

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Client details</h2>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full name <span className="text-red-500">*</span></label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Sarah Mokoena"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone number <span className="text-red-500">*</span></label>
          <input
            required
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. 0821234567"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-400 mt-1">Type this from your records — never captured from this device.</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Email address <span className="text-gray-400">(optional)</span></label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Delivery address <span className="text-red-500">*</span></label>
          <input
            required
            value={deliveryAddress}
            onChange={e => setDeliveryAddress(e.target.value)}
            placeholder="e.g. 12 Oak Street, Fourways"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Cylinder</h2>
            <p className="text-xs text-gray-400 mt-0.5">Add now, or the client can add it when they scan their tag.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={addCylinder}
              onChange={e => setAddCylinder(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm font-medium text-gray-700">Add now</span>
          </label>
        </div>

        {addCylinder && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Appliance type</label>
                <select
                  value={applianceType}
                  onChange={e => setApplianceType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {APPLIANCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cylinder size (kg)</label>
                <select
                  value={cylinderSizeKg}
                  onChange={e => setCylinderSizeKg(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {CYLINDER_SIZES.map(s => (
                    <option key={s} value={s}>{s}kg</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Empty-date estimate</h3>
              <div className="space-y-2">
                {(["measured", "estimate", "industry"] as const).map(basis => (
                  <label key={basis} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="predictionBasis"
                      value={basis}
                      checked={predictionBasis === basis}
                      onChange={() => setPredictionBasis(basis)}
                      className="mt-0.5 accent-orange-500"
                    />
                    <span className="text-sm text-gray-800">
                      {basis === "measured" && "I have two purchase dates — calculate the interval"}
                      {basis === "estimate" && "I'll give my own estimate in months"}
                      {basis === "industry" && "Use the industry average for this cylinder size"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Last purchase date <span className="text-gray-400">(optional — leave blank to anchor from today)</span>
              </label>
              <input
                type="date"
                value={lastPurchaseDate}
                onChange={e => setLastPurchaseDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {predictionBasis === "measured" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Previous purchase date <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={previousPurchaseDate}
                  onChange={e => setPreviousPurchaseDate(e.target.value)}
                  max={lastPurchaseDate || new Date().toISOString().split("T")[0]}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-400 mt-1">System will calculate the interval between these two dates.</p>
              </div>
            )}

            {predictionBasis === "estimate" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Your estimate (months) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min="0.5"
                  max="36"
                  step="0.5"
                  value={estimateMonths}
                  onChange={e => setEstimateMonths(e.target.value)}
                  placeholder="e.g. 3.5"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-3">
        <h2 className="font-semibold text-gray-900 text-sm">Event tag <span className="text-gray-400 font-normal">(optional)</span></h2>
        <input
          type="text"
          value={eventTag}
          onChange={e => setEventTag(e.target.value)}
          placeholder="e.g. dainfern_oct31"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
        />
        <p className="text-xs text-gray-400">Saved on this device — auto-fills for the next client.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Saving…" : "Register client and assign tag"}
      </button>

      <div className="text-center pb-4">
        <button
          type="button"
          onClick={lockDevice}
          className="text-xs text-gray-400 hover:text-gray-600 underline"
        >
          Lock admin on this device
        </button>
      </div>
    </form>
  );
}
