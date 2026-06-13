"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteCylinderButton({
  applianceId,
  clientId,
  label,
}: {
  applianceId: string;
  clientId: string;
  label: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await fetch(`/api/client/appliances/${applianceId}?clientId=${clientId}`, {
      method: "DELETE",
    });
    setLoading(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-500">Remove this cylinder?</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-xs text-red-600 font-semibold hover:underline disabled:opacity-50"
        >
          {loading ? "Removing…" : "Yes, remove"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-gray-400 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="text-xs text-blue-900 hover:text-blue-700 mt-2 block"
    >
      Remove cylinder
    </button>
  );
}
