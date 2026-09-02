"use client";

import { useEffect, useRef, useState } from "react";

export default function TagScanner({
  onScan,
  onClose,
}: {
  onScan: (raw: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      let stream: MediaStream;
      try {
        // Prefer rear camera; some older Android phones reject the facingMode
        // constraint even when a camera is available, so fall back to any camera.
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);
        scan();
      } catch {
        setError("Camera access denied or unavailable. Paste the tag ID manually below.");
      }
    }

    function scan() {
      if (cancelled || !videoRef.current) return;
      const video = videoRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          // Dynamic import keeps jsQR out of the server bundle.
          import("jsqr").then(({ default: jsQR }) => {
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code?.data) {
              stop();
              onScan(code.data);
              return;
            }
            if (!cancelled) frameRef.current = requestAnimationFrame(scan);
          });
          return;
        }
      }
      if (!cancelled) frameRef.current = requestAnimationFrame(scan);
    }

    function stop() {
      cancelled = true;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    }

    start();
    return stop;
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Point camera at keyring</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="relative bg-black aspect-square">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Targeting reticle */}
          {ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/70 rounded-xl" />
            </div>
          )}
        </div>

        <div className="px-5 py-4 space-y-3">
          {error ? (
            <p className="text-sm text-red-600 text-center">{error}</p>
          ) : (
            <p className="text-xs text-gray-400 text-center">
              {ready ? "Hold steady — scanning automatically" : "Starting camera…"}
            </p>
          )}
          <button
            onClick={onClose}
            className="w-full border border-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
