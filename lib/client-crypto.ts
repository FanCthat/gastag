import { createHash } from "crypto";
import { unwrapKey, encrypt, decrypt } from "./encryption";

export function getVendorDataKey(wrappedDataKey: string): string {
  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) throw new Error("MASTER_KEY not set");
  return unwrapKey(wrappedDataKey, masterKey);
}

// Canonical SA phone form: digits only, 0-prefix.
// 082 499 3552  → 0824993552
// +27824993552  → 0824993552
// 27824993552   → 0824993552
// 824993552     → 0824993552 (9-digit SA mobile missing leading 0)
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) return "0" + digits.slice(2);
  // SA mobiles start with 6, 7, or 8 and are 10 digits locally.
  // A 9-digit number starting with one of those is a missing leading 0.
  if (digits.length === 9 && /^[678]/.test(digits)) return "0" + digits;
  return digits;
}

export function hashPhone(phone: string): string {
  return createHash("sha256").update(normalisePhone(phone)).digest("hex");
}

export function encryptField(value: string, dataKey: string): string {
  return encrypt(value, dataKey);
}

export function decryptField(ciphertext: string, dataKey: string): string {
  return decrypt(ciphertext, dataKey);
}

// Resolves a PII string field regardless of whether the vendor uses encryption.
// For encrypted vendors: decrypts encValue. For non-encrypted: returns plainValue.
export function resolveField(
  encValue: string | null | undefined,
  plainValue: string | null | undefined,
  dataKey: string | null,
): string {
  if (dataKey && encValue) {
    return decrypt(encValue, dataKey);
  }
  return plainValue ?? "";
}

// Normalised SHA-256 of an email address — used as the lookup key when email is encrypted.
export function hashEmail(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
}

// Resolves the cylinder size regardless of whether the vendor uses encryption.
// For encrypted vendors: decrypts cylinderSizeEnc. For non-encrypted (GasSA): returns cylinderSizeKg as-is.
export function resolveCylinderSize(
  cylinderSizeKg: number | null,
  cylinderSizeEnc: string | null,
  dataKey: string | null,
): number {
  if (dataKey && cylinderSizeEnc) {
    return parseFloat(decrypt(cylinderSizeEnc, dataKey));
  }
  return cylinderSizeKg ?? 0;
}
