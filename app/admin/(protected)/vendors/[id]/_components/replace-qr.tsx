"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string | null; email: string | null };
type UnregisteredQR = { id: string };

export default function ReplaceQR({ clients, unregisteredQRs }: { clients: Client[]; unregisteredQRs: UnregisteredQR[] }) {
  const router = useRouter();
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedQR, setSelectedQR] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    const res = await fetch(`/api/admin/clients/${selectedClient}/replace-qr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newQrCodeId: selectedQR }),
    });
    const data = await res.json();
    setLoading(false);
    setResult(data);
    if (data.ok) {
      setSelectedClient("");
      setSelectedQR("");
      router.refresh();
    }
  }

  if (clients.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="font-medium text-gray-900 mb-1">Replace a client's lost keyring tag</div>
      <p className="text-xs text-gray-500 mb-4">Select the client and an unregistered QR code to assign to them. Their account history is preserved.</p>
      {unregisteredQRs.length === 0 ? (
        <p className="text-sm text-amber-600">No unregistered QR codes available — generate more first.</p>
      ) : (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Client</label>
            <select
              required
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select client…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name ?? "[encrypted]"} ({c.email ?? "encrypted"})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">New QR code</label>
            <select
              required
              value={selectedQR}
              onChange={e => setSelectedQR(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select code…</option>
              {unregisteredQRs.map(q => (
                <option key={q.id} value={q.id}>{q.id.slice(0, 12)}…</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {loading ? "Replacing…" : "Replace tag"}
          </button>
          {result?.ok && <span className="text-sm text-green-600">Done! New tag is now active.</span>}
          {result?.error && <span className="text-sm text-red-600">{result.error}</span>}
        </form>
      )}
    </div>
  );
}
