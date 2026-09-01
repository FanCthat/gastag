"use client";

import { useState } from "react";

export default function BackfillPhoneHashesButton() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [result, setResult] = useState<{ updated: number; skipped: string[] } | null>(null);

  async function run() {
    setStatus("running");
    try {
      const res = await fetch("/api/admin/backfill-phone-hashes", { method: "POST" });
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setResult(data);
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <p className="text-sm font-semibold text-gray-900 mb-1">Backfill phone hashes</p>
      <p className="text-xs text-gray-500 mb-4">
        One-time job: generates a phone verification hash for every client that has a phone number
        but no hash yet. Safe to run multiple times — already-hashed records are skipped.
      </p>
      {status === "idle" && (
        <button
          onClick={run}
          className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          Run backfill
        </button>
      )}
      {status === "running" && (
        <p className="text-sm text-gray-500">Running…</p>
      )}
      {status === "done" && result && (
        <div className="text-sm">
          <p className="text-green-700 font-semibold">Done — {result.updated} record{result.updated !== 1 ? "s" : ""} updated.</p>
          {result.skipped.length > 0 && (
            <p className="text-amber-700 mt-1">
              {result.skipped.length} skipped (no phone on file): {result.skipped.join(", ")}
            </p>
          )}
          {result.skipped.length === 0 && (
            <p className="text-gray-500 mt-1">No records skipped.</p>
          )}
        </div>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">Something went wrong. Check you're logged in as admin and try again.</p>
      )}
    </div>
  );
}
