"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPinSection({ qrCodeId }: { qrCodeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin-pin/${qrCodeId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (res.status === 429) {
        setError("Too many incorrect attempts. Try again in 15 minutes.");
        return;
      }
      if (!res.ok) {
        setError("Incorrect PIN. Please try again.");
        setPin("");
        return;
      }
      router.push(`/scan/${qrCodeId}/pre-register`);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="text-center">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          Admin use only
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div>
        <p className="text-sm font-semibold text-gray-900">Admin access</p>
        <p className="text-xs text-gray-500 mt-1">Enter your admin PIN to pre-register this tag on behalf of a client.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          value={pin}
          onChange={e => setPin(e.target.value)}
          placeholder="PIN"
          autoFocus
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 tracking-widest focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setOpen(false); setPin(""); setError(null); }}
            className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !pin}
            className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </div>
      </form>
    </div>
  );
}
