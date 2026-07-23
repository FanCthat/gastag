"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewVendorForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    contactEmail: "",
    password: "",
    region: "",
    whatsapp: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/admin/vendors");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to create vendor.");
    }
  }

  const fields = [
    { key: "name", label: "Business name", type: "text", required: true },
    { key: "contactName", label: "Contact person", type: "text", required: true },
    { key: "contactEmail", label: "Login email", type: "email", required: true },
    { key: "password", label: "Initial password", type: "password", required: true },
    { key: "whatsapp", label: "WhatsApp number", type: "tel", required: false },
    { key: "region", label: "Region / area", type: "text", required: false },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {f.label}
            {!f.required && <span className="text-gray-400 ml-1">(optional)</span>}
          </label>
          <input
            type={f.type}
            required={f.required}
            value={(form as any)[f.key]}
            onChange={e => set(f.key, e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      ))}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating…" : "Create vendor"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
