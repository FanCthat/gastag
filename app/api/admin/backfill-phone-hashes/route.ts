import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getVendorDataKey, decryptField, encryptField, normalisePhone, hashPhone } from "@/lib/client-crypto";

export const runtime = "nodejs";

// Backfill / re-normalise phone hashes for all clients.
// Safe to run multiple times — only writes when the stored hash or encrypted
// phone differs from what the current normalisePhone function would produce.
// Also corrects phoneEnc (and phone for plaintext vendors) when the stored
// value differs from canonical form (e.g. missing leading 0, +27 prefix).
export async function POST() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: {
      OR: [{ phone: { not: null } }, { phoneEnc: { not: null } }],
    },
    select: {
      id: true,
      phone: true,
      phoneEnc: true,
      phoneHash: true,
      vendor: { select: { encryptionOn: true, wrappedDataKey: true } },
    },
  });

  let updated = 0;
  const skipped: string[] = [];

  for (const client of clients) {
    let raw: string | null = null;
    let dataKey: string | null = null;

    if (client.phone) {
      raw = client.phone;
    } else if (client.phoneEnc && client.vendor.encryptionOn && client.vendor.wrappedDataKey) {
      try {
        dataKey = getVendorDataKey(client.vendor.wrappedDataKey);
        raw = decryptField(client.phoneEnc, dataKey);
      } catch {
        skipped.push(client.id);
        continue;
      }
    }

    if (!raw) {
      skipped.push(client.id);
      continue;
    }

    const canonical = normalisePhone(raw);
    const correctHash = hashPhone(canonical);

    // Only write if something actually needs changing.
    const hashWrong = client.phoneHash !== correctHash;
    const phoneWrong = canonical !== raw.replace(/\D/g, "") && canonical !== raw;

    if (!hashWrong && !phoneWrong) continue;

    const updateData: Record<string, unknown> = { phoneHash: correctHash };

    if (phoneWrong) {
      if (client.vendor.encryptionOn && client.vendor.wrappedDataKey) {
        if (!dataKey) dataKey = getVendorDataKey(client.vendor.wrappedDataKey);
        updateData.phoneEnc = encryptField(canonical, dataKey);
      } else {
        updateData.phone = canonical;
      }
    }

    await prisma.client.update({
      where: { id: client.id },
      data: updateData,
    });
    updated++;
  }

  return NextResponse.json({ updated, skipped });
}
