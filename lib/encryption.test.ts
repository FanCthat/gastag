import { encrypt, decrypt, hashKey, generateKey, wrapKey, unwrapKey } from "./encryption";

const key = generateKey();
const masterKey = generateKey();

// 1. encrypt then decrypt returns the original string
{
  const cases = [
    "hello world",
    "",
    "a".repeat(10_000),
    "café résumé naïve",
    "日本語テスト",
    "🔥💧🌊",
    "südstraße",
  ];
  for (const original of cases) {
    const ct = encrypt(original, key);
    const result = decrypt(ct, key);
    if (result !== original) {
      throw new Error(`round-trip FAILED for: ${JSON.stringify(original)}\ngot: ${JSON.stringify(result)}`);
    }
  }
  console.log("✓ encrypt→decrypt round-trip (including empty, long, unicode, emoji)");
}

// 2. decrypt with wrong key throws (does not return garbage)
{
  const ct = encrypt("sensitive data", key);
  const wrongKey = generateKey();
  let threw = false;
  try {
    decrypt(ct, wrongKey);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("wrong-key decrypt should throw but did not");
  console.log("✓ decrypt with wrong key throws");
}

// 3. tampering with ciphertext throws (GCM auth tag catches it)
{
  const ct = encrypt("sensitive data", key);
  const parts = ct.split(":");
  // Flip a byte in the encrypted payload
  const tampered = parts[2].slice(0, -2) + (parts[2].slice(-2) === "ff" ? "00" : "ff");
  const tamperedCt = [parts[0], parts[1], tampered].join(":");
  let threw = false;
  try {
    decrypt(tamperedCt, key);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("tampered ciphertext should throw but did not");
  console.log("✓ tampered ciphertext throws (GCM auth tag)");
}

// 4. hashKey is deterministic and one-way
{
  const h1 = hashKey(key);
  const h2 = hashKey(key);
  if (h1 !== h2) throw new Error("hashKey not deterministic");
  if (h1 === key) throw new Error("hashKey returned the key itself");
  if (h1.length !== 64) throw new Error(`hashKey unexpected length: ${h1.length}`);
  console.log("✓ hashKey deterministic and one-way");
}

// 5. wrapKey then unwrapKey returns the original data key
{
  const dataKey = generateKey();
  const wrapped = wrapKey(dataKey, masterKey);
  const unwrapped = unwrapKey(wrapped, masterKey);
  if (unwrapped !== dataKey) throw new Error("wrapKey/unwrapKey round-trip FAILED");
  console.log("✓ wrapKey→unwrapKey round-trip");
}

// 6. Each encrypt call produces a unique ciphertext (random IV)
{
  const ct1 = encrypt("same plaintext", key);
  const ct2 = encrypt("same plaintext", key);
  if (ct1 === ct2) throw new Error("two encryptions of same plaintext produced identical ciphertext (IV not random)");
  console.log("✓ each encrypt produces unique ciphertext (random IV confirmed)");
}

console.log("\nAll encryption tests passed.");
