"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Vendor = {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactEmail2: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
  region: string | null;
  isActive: boolean;
  isDemo: boolean;
  unregisteredQrCodes: number;
  _count: { clients: number; qrCodes: number; orders: number };
};

export default function VendorDetailClient({ vendor }: { vendor: Vendor }) {
  const router = useRouter();
  const [isActive, setIsActive] = useState(vendor.isActive);
  const [isDemo, setIsDemo] = useState(vendor.isDemo);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const [activateError, setActivateError] = useState("");
  const [qrCount, setQrCount] = useState(10);
  const [qrError, setQrError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [newEmail, setNewEmail] = useState(vendor.contactEmail);
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [newEmail2, setNewEmail2] = useState(vendor.contactEmail2 ?? "");
  const [savingEmail2, setSavingEmail2] = useState(false);
  const [email2Saved, setEmail2Saved] = useState(false);
  const [whatsapp, setWhatsapp] = useState(vendor.whatsapp ?? "");
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [whatsappSaved, setWhatsappSaved] = useState(false);
  const [logoUrl, setLogoUrl] = useState(vendor.logoUrl ?? "");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function activateFromDemo() {
    setActivating(true);
    setActivateError("");
    const res = await fetch(`/api/admin/vendors/${vendor.id}/activate-demo`, { method: "POST" });
    if (res.ok) {
      setIsDemo(false);
      setActivated(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setActivateError(d.error || "Activation failed.");
    }
    setActivating(false);
  }

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

  async function saveEmail2() {
    setSavingEmail2(true);
    await fetch(`/api/admin/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactEmail2: newEmail2.trim() || null }),
    });
    setSavingEmail2(false);
    setEmail2Saved(true);
    setTimeout(() => setEmail2Saved(false), 3000);
  }

  async function saveWhatsapp() {
    setSavingWhatsapp(true);
    await fetch(`/api/admin/vendors/${vendor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp: whatsapp.trim() || null }),
    });
    setSavingWhatsapp(false);
    setWhatsappSaved(true);
    setTimeout(() => setWhatsappSaved(false), 3000);
  }

  async function uploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload/image", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) {
      setLogoUrl(data.url);
      await fetch(`/api/admin/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl: data.url }),
      });
      setLogoSaved(true);
      setTimeout(() => setLogoSaved(false), 3000);
    }
    setUploadingLogo(false);
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

  async function deleteVendor() {
    setDeleting(true);
    setDeleteError("");
    const res = await fetch(`/api/admin/vendors/${vendor.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/vendors");
    } else {
      const d = await res.json().catch(() => ({}));
      setDeleteError(d.error || "Delete failed — please try again.");
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const stats = [
    { label: "Total QR codes", value: vendor._count.qrCodes },
    { label: "Unregistered codes", value: vendor.unregisteredQrCodes },
    { label: "Registered clients", value: vendor._count.clients },
    { label: "Orders", value: vendor._count.orders },
  ];

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-5 mb-4">
          <div className="font-bold text-blue-900 mb-1">Demo vendor — awaiting payment</div>
          <p className="text-sm text-blue-700 mb-3">
            This supplier signed up via the demo system. Once you have received payment, click Activate to:
            wipe demo test data, make them live, and send their welcome email.
          </p>
          <button
            onClick={activateFromDemo}
            disabled={activating}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {activating ? "Activating…" : "✓ Payment received — Activate vendor"}
          </button>
          {activateError && <p className="text-sm text-red-600 mt-2">{activateError}</p>}
          {activated && <p className="text-sm text-green-600 mt-2">Activated! Welcome email sent.</p>}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Status toggle — deactivation only. Activation goes through the Activate button above. */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Account status</div>
          <div className="text-sm text-gray-500 mt-0.5">
            {isActive ? "Vendor can log in and is active." : "Vendor is inactive and cannot log in."}
          </div>
        </div>
        {isActive && (
          <button
            onClick={toggleActive}
            disabled={toggling}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 bg-red-50 text-red-600 hover:bg-red-100"
          >
            {toggling ? "…" : "Deactivate"}
          </button>
        )}
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
            className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
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

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-medium text-gray-900 mb-3">Vendor logo</div>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-14 w-auto object-contain rounded border border-gray-200 bg-gray-50 p-1" />
          ) : (
            <div className="h-14 w-20 rounded border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-400">No logo</div>
          )}
          <div>
            <input ref={logoFileRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
            <button
              onClick={() => logoFileRef.current?.click()}
              disabled={uploadingLogo}
              className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {uploadingLogo ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
            </button>
            {logoSaved && <span className="text-sm text-green-600 ml-3">Saved!</span>}
          </div>
        </div>
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

      {/* Secondary / fallback email */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-medium text-gray-900 mb-1">Secondary email (CC on orders)</div>
        <div className="text-xs text-gray-400 mb-3">CC'd on every new order notification. Leave blank if not needed.</div>
        <div className="flex items-center gap-3">
          <input
            type="email"
            value={newEmail2}
            onChange={e => setNewEmail2(e.target.value)}
            placeholder="e.g. edson@gassafourways.co.za"
            className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={saveEmail2}
            disabled={savingEmail2}
            className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {savingEmail2 ? "Saving…" : "Save"}
          </button>
          {email2Saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>

      {/* WhatsApp number for refill bookings */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="font-medium text-gray-900 mb-1">WhatsApp number (refill bookings)</div>
        <div className="text-xs text-gray-400 mb-3">Clients tap "Bring in for refill" on the reorder page and WhatsApp this number directly. Use international format e.g. +27821234567</div>
        <div className="flex items-center gap-3">
          <input
            type="tel"
            value={whatsapp}
            onChange={e => setWhatsapp(e.target.value)}
            placeholder="e.g. +27821234567"
            className="flex-1 max-w-xs border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            onClick={saveWhatsapp}
            disabled={savingWhatsapp}
            className="bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
          >
            {savingWhatsapp ? "Saving…" : "Save"}
          </button>
          {whatsappSaved && <span className="text-sm text-green-600">Saved!</span>}
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

      {/* Delete supplier */}
      <div className="bg-white rounded-xl border border-red-200 p-5">
        <div className="font-medium text-red-700 mb-1">Delete supplier</div>
        <p className="text-sm text-gray-500 mb-4">
          Permanently removes this supplier and all their data — QR codes, clients, orders, and notifications. This cannot be undone.
        </p>
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Delete supplier…
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={deleteVendor}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
        {deleteError && <p className="text-sm text-red-600 mt-2">{deleteError}</p>}
      </div>
    </div>
  );
}
