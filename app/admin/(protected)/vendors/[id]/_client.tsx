"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Vendor = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  region: string | null;
  isActive: boolean;
  unregisteredQrCodes: number;
  _count: { clients: number; qrCodes: number; orders: number };
};

export default function VendorDetailClient({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(vendor.isActive);
  const [qrCount, setQrCount] = useState(10);
  const [qrError, setQrError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [newEmail, setNewEmail] = useState(vendor.contactEmail);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  async function toggleActive() {
    setToggling(true);
    await fetch(`/api/admin/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setIsActive(a => !a);
    setToggling(false);
  }

  async function generateQR() {
    setGenerating(true);
    setQrError("");
    try {
      const res = await fetch(`/api/admin/vendors/${vendor.id}/qr-codes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: qrCount }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `gastag-qr-${vendor.id}-${qrCount}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setQrError(data.error || `Error ${res.status} — check Vercel logs.`);
      }
    } catch (e: any) {
      setQrError((e as any).message || "Network error.");
    }
    setGenerating(false);
  }

  async function saveEmail() {
    if (!newEmail.trim()) return;
    setSavingEmail(true);
    await fetch(`/api/admin/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail: newEmail.trim() }),
    });
    setSavingEmail(false);
    setEmailSaved(true);
    setTimeout(() => setEmailSaved(false), 3000);
  }

  async function savePassword() {
    if (!newPassword.trim()) return;
    setSavingPassword(true);
    await fetch(`/api/admin/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    setSavingPassword(false);
    setNewPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 3000);
  }

  const stats = [
    { label: "Total QR codes", value: vendor._count.qrCodes },
    { label: "Unregistered codes", value: vendor.unregisteredQrCodes },
    { label: "Registered clients", value: vendor._count.clients },
    { label: "Orders", value: vendor._count.orders },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Account status</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {isActive ? "Vendor can log in and is active." : "Vendor is inactive and cannot log in."}
          </div>
        </div>
        <button
          onClick={toggleActive}
          disabled={toggling}
          className={`text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
            isActive
              ? "bg-red-50 text-red-600 hover:bg-red-100"
              : "bg-green-50 text-green-700 hover:bg-green-100"
          }`}
        >
          {toggling ? "…" : isActive ? "Deactivate" : "Activate"}
        </button>
      </div>

      {/* QR code generation */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-medium text-gray-900 mb-3">Generate QR codes</div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={1}
            max={500}
            value={qrCount}
            onChange={e => setQrCount(parseInt(e.target.value) || 1)}
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={generateQR}
            disabled={generating}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {generating ? "Generating…" : "Download ZIP"}
          </button>
          <span className="text-xs text-gray-400">PNG files, one per code</span>
        </div>
        {qrError && <p className="text-sm text-red-600 mt-2">{qrError}</p>}
      </div>

      {/* Change login email */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-medium text-gray-900 mb-3">Change login email</div>
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={saveEmail}
            disabled={savingEmail || !newEmail.trim() || newEmail.trim() === vendor.contactEmail}
            className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {savingEmail ? "Saving…" : "Save"}
          </button>
          {emailSaved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>

      {/* Reset password */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-medium text-gray-900 mb-3">Reset vendor password</div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <input
              type={showNewPassword ? "text" : "password"}
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-14 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
            >
              {showNewPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button
            onClick={savePassword}
            disabled={savingPassword || !newPassword.trim()}
            className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {savingPassword ? "Saving…" : "Save"}
          </button>
          {passwordSaved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
