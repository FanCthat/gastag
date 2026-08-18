import { unwrapKey, encrypt, decrypt } from "./encryption";

export function getVendorDataKey(wrappedDataKey: string): string {
  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) throw new Error("MASTER_KEY not set");
  return unwrapKey(wrappedDataKey, masterKey);
}

export function encryptField(value: string, dataKey: string): string {
  return encrypt(value, dataKey);
}

export function decryptField(ciphertext: string, dataKey: string): string {
  return decrypt(ciphertext, dataKey);
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
