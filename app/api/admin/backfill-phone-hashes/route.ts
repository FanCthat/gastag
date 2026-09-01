import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getVendorDataKey, decryptField, normalisePhone, hashPhone } from "@/lib/client-crypto";

export const runtime = "nodejs";

// One-time backfill: compute phoneHash for every client that has a phone
// (encrypted or plaintext) but no hash yet.
//
// Safe to run multiple times — WHERE clause skips clients who already have a hash.
// Returns a count of rows updated.
export async function POST() {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: { phoneHash: null },
    select: {
      id: true,
      phone: true,
      phoneEnc: true,
      vendor: { select: { encryptionOn: true, wrappedDataKey: true } },
    },
  });

  let updated = 0;
  const skipped: string[] = [];

  for (const client of clients) {
    let raw: string | null = null;

    if (client.phone) {
      raw = client.phone;
    } else if (client.phoneEnc && client.vendor.encryptionOn && client.vendor.wrappedDataKey) {
      try {
        const dataKey = getVendorDataKey(client.vendor.wrappedDataKey);
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
    const hash = hashPhone(canonical);

    await prisma.client.update({
      where: { id: client.id },
      data: { phoneHash: hash },
    });
    updated++;
  }

  return NextResponse.json({ updated, skipped });
}
