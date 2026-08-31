"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MutedBanner({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
        Reminders are back on. You'll receive emails before your cylinder runs out.
      </div>
    );
  }

  async function handleUnmute() {
    setLoading(true);
    try {
      await fetch(`/api/client/${clientId}/unmute-notifications`, { method: "POST" });
      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl bg-gray-100 border border-gray-300 px-4 py-3 flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-gray-800">Reminders are paused</p>
        <p className="text-xs text-gray-500 mt-0.5">You won't receive reminder emails. Your keyring still works for reordering.</p>
      </div>
      <button
        onClick={handleUnmute}
        disabled={loading}
        className="flex-shrink-0 text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50 whitespace-nowrap mt-0.5"
      >
        {loading ? "…" : "Turn on"}
      </button>
    </div>
  );
}
