"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PendingClient = { id: string; displayName: string; requestedAt: string };

export default function RemovalRequestsBanner({ clients }: { clients: PendingClient[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [suppressing, setSuppressing] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [suppressError, setSuppressError] = useState<string | null>(null);

  const visible = clients.filter(c => !done.has(c.id));
  if (visible.length === 0) return null;

  async function suppress(clientId: string) {
    setSuppressing(clientId);
    setSuppressError(null);
    try {
      const res = await fetch(`/api/vendor/suppress-client/${clientId}`, { method: "POST" });
      if (res.ok) {
        setDone(prev => new Set([...prev, clientId]));
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setSuppressError(body.detail ?? body.error ?? `Server error ${res.status}`);
      }
    } catch {
      setSuppressError("Network error — please try again.");
    } finally {
      setSuppressing(null);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-red-600 font-bold text-sm">
            ⚠ {visible.length} removal request{visible.length !== 1 ? "s" : ""} pending
          </span>
          <span className="text-xs text-red-500">— action required before this banner clears</span>
        </div>
        <span className="text-red-400 text-xs">{expanded ? "▲ hide" : "▼ show"}</span>
      </button>

      {expanded && (
        <div className="border-t border-red-200 divide-y divide-red-100">
          {visible.map(c => (
            <div key={c.id} className="px-4 py-3 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">{c.displayName}</p>
                <p className="text-xs text-gray-500">
                  Requested {new Date(c.requestedAt).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => suppress(c.id)}
                disabled={suppressing === c.id}
                className="flex-shrink-0 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {suppressing === c.id ? "Suppressing…" : "Suppress client"}
              </button>
            </div>
          ))}
          <div className="px-4 py-3 bg-red-50/50 space-y-1">
            <p className="text-xs text-red-700">
              Suppressing stops all contact and reduces the record to a do-not-contact identifier only.
              This cannot be undone and clears this alert permanently.
            </p>
            {suppressError && (
              <p className="text-xs font-medium text-red-900 bg-red-100 border border-red-300 rounded px-2 py-1">
                Error: {suppressError}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
