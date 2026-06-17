"use client";

import { useState, useRef } from "react";

type Client = { id: string; name: string; email: string };

export default function BroadcastForm({ clients }: { clients: Client[] }) {
  const allIds = clients.map(c => c.id);

  const [selected, setSelected] = useState<Set<string>>(new Set(allIds));
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const allSelected = selected.size === clients.length;
  const noneSelected = selected.size === 0;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/image", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) {
      setImageUrl(data.url);
    } else {
      setError(data.error || "Image upload failed.");
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || noneSelected) return;
    setSending(true);
    setError("");
    setResult(null);
    const res = await fetch("/api/vendor/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject,
        message,
        imageUrl: imageUrl || null,
        clientIds: Array.from(selected),
      }),
    });
    const data = await res.json();
    setSending(false);
    if (res.ok) {
      setResult({ sent: data.sent, failed: data.failed });
      setSubject("");
      setMessage("");
      setImageUrl("");
      setSelected(new Set(allIds));
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setError(data.error || "Failed to send.");
    }
  }

  const cls = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500";

  return (
    <div className="max-w-2xl space-y-6">

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-green-700">Sent successfully!</p>
          <p className="text-sm text-green-600">{result.sent} email{result.sent !== 1 ? "s" : ""} delivered{result.failed > 0 ? `, ${result.failed} failed` : ""}.</p>
        </div>
      )}

      {/* Recipient selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium text-gray-900 text-sm">
            Recipients — <span className="text-orange-500">{selected.size} of {clients.length} selected</span>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
        </div>
        <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
          {clients.map(c => (
            <label key={c.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggleOne(c.id)}
                className="w-4 h-4 accent-orange-500 shrink-0"
              />
              <span className="text-sm text-gray-800 flex-1 min-w-0">
                {c.name}
                <span className="text-gray-400 ml-2 text-xs">{c.email}</span>
              </span>
            </label>
          ))}
        </div>
        {noneSelected && <p className="text-xs text-red-500 mt-2">Select at least one recipient.</p>}
      </div>

      {/* Compose */}
      <form onSubmit={handleSend} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject line</label>
          <input
            type="text"
            required
            placeholder="e.g. June Special — 10% off 9kg cylinders"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className={cls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            required
            rows={6}
            placeholder="Type your special offer message here…"
            value={message}
            onChange={e => setMessage(e.target.value)}
            className={cls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Promo image <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100 cursor-pointer"
          />
          {uploading && <p className="text-xs text-gray-400 mt-1">Uploading…</p>}
          {imageUrl && !uploading && (
            <div className="mt-2 flex items-center gap-3">
              <img src={imageUrl} alt="Preview" className="h-16 w-auto rounded-lg border border-gray-200 object-cover" />
              <button type="button" onClick={() => { setImageUrl(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={sending || uploading || !subject.trim() || !message.trim() || noneSelected}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {sending ? "Sending…" : `Send to ${selected.size} client${selected.size !== 1 ? "s" : ""}`}
        </button>
      </form>
    </div>
  );
}
