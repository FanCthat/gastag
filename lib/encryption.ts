import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

export function encrypt(plaintext: string, keyHex: string): string {
  const key = Buffer.from(keyHex, "hex");
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decrypt(ciphertext: string, keyHex: string): string {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  const key = Buffer.from(keyHex, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function hashKey(keyHex: string): string {
  return crypto.createHash("sha256").update(keyHex).digest("hex");
}

export function generateKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function wrapKey(dataKeyHex: string, masterKeyHex: string): string {
  return encrypt(dataKeyHex, masterKeyHex);
}

export function unwrapKey(wrappedKey: string, masterKeyHex: string): string {
  return decrypt(wrappedKey, masterKeyHex);
}
