"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InitialData = {
  name: string;
  phone: string;
  email: string | null;
  deliveryAddress: string;
  vendorName: string;
};

export default function ConfirmShell({
  clientId,
  trusted,
  initialData,
  returnUrl,
}: {
  clientId: string;
  trusted: boolean;
  initialData: InitialData | null;
  returnUrl?: string | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"neutral" | "form" | "removal" | "done" | "removed">(
    trusted ? "form" : "neutral"
  );
  const [data, setData] = useState<InitialData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state — pre-populated from initial data
  const [name, setName] = useState(initialData?.name ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [address, setAddress] = useState(initialData?.deliveryAddress ?? "");

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/${clientId}/confirm`);
      if (!res.ok) { setError("Could not load your details. Please try again."); return; }
      const d: InitialData = await res.json();
      setData(d);
      setName(d.name);
      setPhone(d.phone);
      setEmail(d.email ?? "");
      setAddress(d.deliveryAddress);
      setStage("form");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/client/${clientId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email: email || null, deliveryAddress: address }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Something went wrong.");
        return;
      }
      if (returnUrl) {
        router.push(returnUrl);
      } else {
        setStage("done");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemovalRequest() {
    setLoading(true);
    try {
      await fetch(`/api/client/${clientId}/request-removal`, { method: "POST" });
      setStage("removed");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "neutral") {
    return (
      <div className="max-w-sm mx-auto pt-16 px-4 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-orange-500 rounded-2xl mb-2">
          <span className="text-white text-2xl font-bold">G</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold text-gray-900">Your GasSA keyring is ready</h1>
          <p className="text-sm text-gray-500">
            Your gas account has been set up — you'll receive reminders before your cylinder runs out.
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600 text-left space-y-2">
          <p className="font-semibold text-gray-800">Before your first reminder arrives</p>
          <p>Tap below to check your details and make sure everything is correct. If you'd prefer not to be on this system, you can opt out — no hard feelings.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          {loading ? "Loading…" : "View and confirm my details"}
        </button>
        <button
          onClick={() => setStage("removal")}
          className="text-sm text-gray-400 hover:text-gray-600 underline"
        >
          I'd prefer not to receive these reminders
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (stage === "form") {
    return (
      <form onSubmit={handleSave} className="max-w-sm mx-auto pt-10 px-4 space-y-5">
        <div className="text-center space-y-1 mb-2">
          <h1 className="text-xl font-bold text-gray-900">Confirm your details</h1>
          <p className="text-sm text-gray-500">
            These were loaded from {data?.vendorName ?? "your supplier"}. Correct anything that's wrong and tap Save.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
            <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email address <span className="text-gray-400">(optional)</span></label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Delivery address</label>
            <input required value={address} onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          Your contact details are held by {data?.vendorName ?? "your supplier"} for the purpose of sending gas refill reminders. You can opt out at any time.
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
          {loading ? "Saving…" : "Save and confirm"}
        </button>

        <div className="text-center">
          <button type="button" onClick={() => setStage("removal")}
            className="text-xs text-gray-400 hover:text-gray-600 underline">
            I'd prefer not to receive these reminders
          </button>
        </div>
      </form>
    );
  }

  if (stage === "removal") {
    return (
      <div className="max-w-sm mx-auto pt-16 px-4 text-center space-y-5">
        <h1 className="text-xl font-bold text-gray-900">Opt out of reminders</h1>
        <p className="text-sm text-gray-500">
          If you'd like to be removed from this system, tap below. Your supplier will be notified and your record will be removed within a few days.
        </p>
        <button onClick={handleRemovalRequest} disabled={loading}
          className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
          {loading ? "Sending…" : "Yes, please remove me"}
        </button>
        <button onClick={() => setStage(trusted ? "form" : "neutral")}
          className="w-full border border-gray-200 text-gray-600 font-medium py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors">
          Cancel — keep my reminders
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (stage === "done") {
    return (
      <div className="max-w-sm mx-auto pt-16 px-4 text-center space-y-4">
        <div className="text-4xl">✅</div>
        <h1 className="text-xl font-bold text-gray-900">All set!</h1>
        <p className="text-sm text-gray-500">
          Your details are confirmed. You'll receive a reminder before your cylinder runs out — just scan this keyring when you're ready to order.
        </p>
      </div>
    );
  }

  if (stage === "removed") {
    return (
      <div className="max-w-sm mx-auto pt-16 px-4 text-center space-y-4">
        <div className="text-4xl">👋</div>
        <h1 className="text-xl font-bold text-gray-900">Request received</h1>
        <p className="text-sm text-gray-500">
          Your removal request has been sent to your supplier. You won't receive any further reminders once it's processed.
        </p>
      </div>
    );
  }

  return null;
}
