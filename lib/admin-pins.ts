import { createHash, createHmac, timingSafeEqual } from "crypto";

export function verifyPin(entered: string): { valid: true; name: string } | { valid: false } {
  const raw = process.env.VENDOR_ADMIN_PINS;
  if (!raw) return { valid: false };

  let pins: Array<{ hash: string; name: string }>;
  try {
    pins = JSON.parse(raw);
  } catch (e) {
    console.log("[verifyPin] JSON.parse failed:", String(e), "raw length:", raw.length, "first chars:", raw.slice(0, 20));
    return { valid: false };
  }

  const enteredHash = createHash("sha256").update(entered.toUpperCase()).digest("hex");
  console.log("[verifyPin] pins count:", pins.length);
  console.log("[verifyPin] enteredHash:", enteredHash);
  console.log("[verifyPin] storedHash[0]:", pins[0]?.hash);
  console.log("[verifyPin] lengths:", pins[0]?.hash?.length, enteredHash.length);

  for (const p of pins) {
    if (
      p.hash.length === enteredHash.length &&
      timingSafeEqual(Buffer.from(p.hash, "hex"), Buffer.from(enteredHash, "hex"))
    ) {
      return { valid: true, name: p.name };
    }
  }
  return { valid: false };
}

export function signAdminCookie(qrCodeId: string, adminName: string): string {
  const secret = process.env.ADMIN_PIN_SECRET;
  if (!secret) throw new Error("ADMIN_PIN_SECRET not set");
  const payload = JSON.stringify({ qrCodeId, adminName, iat: Date.now() });
  const b64 = Buffer.from(payload).toString("base64url");
  const sig = createHmac("sha256", secret).update(b64).digest("hex");
  return `${b64}.${sig}`;
}

export function verifyAdminCookie(
  cookie: string,
  qrCodeId: string,
): { valid: true; adminName: string } | { valid: false } {
  const secret = process.env.ADMIN_PIN_SECRET;
  if (!secret) return { valid: false };

  const dotIdx = cookie.lastIndexOf(".");
  if (dotIdx === -1) return { valid: false };

  const b64 = cookie.slice(0, dotIdx);
  const sig = cookie.slice(dotIdx + 1);

  const expectedSig = createHmac("sha256", secret).update(b64).digest("hex");
  if (sig.length !== expectedSig.length) return { valid: false };
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) return { valid: false };
  } catch {
    return { valid: false };
  }

  let payload: { qrCodeId: string; adminName: string; iat: number };
  try {
    payload = JSON.parse(Buffer.from(b64, "base64url").toString());
  } catch {
    return { valid: false };
  }

  if (payload.qrCodeId !== qrCodeId) return { valid: false };
  if (Date.now() - payload.iat > 60 * 60 * 1000) return { valid: false };

  return { valid: true, adminName: payload.adminName };
}
