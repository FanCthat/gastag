"use client";

import { useState } from "react";

interface Props {
  clientId: string;
  initial: {
    name: string;
    email: string;
    phone: string | null;
    notificationPreference: string;
  };
}

export default function EditProfileForm({ clientId, initial }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [pref, setPref] = useState(initial.notificationPreference);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setResult(null);
    try {
      const res = await fetch(`/api/client/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || null, notificationPreference: pref }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: "Details updated." });
        setOpen(false);
      } else {
        setResult({ ok: false, message: data.error ?? "Something went wrong." });
      }
    } catch {
      setResult({ ok: false, message: "Connection error. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <button
        onClick={() => { setOpen(o => !o); setResult(null); }}
        className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-700"
        type="button"
      >
        <span>Edit my details</span>
        <span className="text-gray-400 text-base">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <form onSubmit={handleSave} className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 082 499 3552"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Reminder preference</label>
            <div className="flex gap-3">
              {(["email", "push", "both"] as const).map(opt => (
                <label key={opt} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="pref"
                    value={opt}
                    checked={pref === opt}
                    onChange={() => setPref(opt)}
                    className="accent-orange-500"
                  />
                  {opt === "both" ? "Email & push" : opt.charAt(0).toUpperCase() + opt.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {result && (
            <p className={`text-sm font-medium ${result.ok ? "text-green-600" : "text-red-600"}`}>
              {result.message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      )}

      {!open && result?.ok && (
        <p className="px-5 pb-4 text-sm text-green-600 font-medium">{result.message}</p>
      )}
    </div>
  );
}
