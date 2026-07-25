"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RecordDeliveryButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "loading">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setStep("loading");
    setError(null);
    try {
      const res = await fetch(`/api/vendor/clients/${clientId}/record-delivery`, { method: "POST" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Failed — please try again.");
        setStep("idle");
      } else {
        router.refresh();
      }
    } catch {
      setError("Network error — please try again.");
      setStep("idle");
    }
  }

  if (step === "idle") {
    return (
      <button
        onClick={() => setStep("confirm")}
        className="mt-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-2.5 py-1 rounded-md transition-colors"
      >
        Record delivery
      </button>
    );
  }

  if (step === "confirm") {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <span className="text-xs text-gray-600">Delivered outside system?</span>
        <button
          onClick={handleConfirm}
          className="text-xs font-medium text-white bg-green-600 hover:bg-green-700 px-2 py-0.5 rounded transition-colors"
        >
          Yes, confirm
        </button>
        <button
          onClick={() => setStep("idle")}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return <span className="mt-1.5 text-xs text-gray-400">Saving…</span>;
}
