import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateKey, wrapKey, hashKey, unwrapKey } from "@/lib/encryption";
import { encryptField, hashEmail } from "@/lib/client-crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// One-off migration: generates a data key for a vendor that has encryptionOn=false,
// then encrypts all their clients' PII (name, email, phone, deliveryAddress) and
// appliances' cylinderSizeKg, then flips encryptionOn=true.
//
// Usage:
//   ?secret=XXX                        — dry run, shows what would change
//   ?secret=XXX&dryRun=false           — executes the migration
//   ?secret=XXX&vendorId=vXXX          — target a specific vendor (default: first encryptionOn=false active vendor)

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") !== "false";
  const vendorId = req.nextUrl.searchParams.get("vendorId");

  const masterKey = process.env.MASTER_KEY;
  if (!masterKey) return NextResponse.json({ error: "MASTER_KEY not set" }, { status: 500 });

  const vendor = await prisma.vendor.findFirst({
    where: vendorId
      ? { id: vendorId }
      : { encryptionOn: false, isActive: true },
    select: { id: true, name: true, encryptionOn: true, wrappedDataKey: true },
  });

  if (!vendor) {
    return NextResponse.json({ error: "No matching vendor found (no active vendor with encryptionOn=false)" }, { status: 404 });
  }

  if (vendor.encryptionOn) {
    return NextResponse.json({
      error: `Vendor "${vendor.name}" already has encryptionOn=true — nothing to migrate`,
    }, { status: 400 });
  }

  // Get or generate the data key
  let dataKey: string;
  let wrappedDataKey: string;
  let newKeyHash: string;
  let keyGenerated: boolean;

  if (vendor.wrappedDataKey) {
    dataKey = unwrapKey(vendor.wrappedDataKey, masterKey);
    wrappedDataKey = vendor.wrappedDataKey;
    newKeyHash = hashKey(dataKey);
    keyGenerated = false;
  } else {
    dataKey = generateKey();
    wrappedDataKey = wrapKey(dataKey, masterKey);
    newKeyHash = hashKey(dataKey);
    keyGenerated = true;
  }

  const clients = await prisma.client.findMany({
    where: { vendorId: vendor.id },
    select: {
      id: true,
      name: true, nameEnc: true,
      email: true, emailEnc: true,
      phone: true, phoneEnc: true,
      deliveryAddress: true, deliveryAddressEnc: true,
    },
  });

  const appliances = await prisma.appliance.findMany({
    where: { client: { vendorId: vendor.id } },
    select: { id: true, cylinderSizeKg: true, cylinderSizeEnc: true },
  });

  const log: string[] = [
    `Vendor: ${vendor.name} (${vendor.id})`,
    `Key: ${keyGenerated ? "NEW key generated" : "existing wrapped key reused"}`,
    `Clients: ${clients.length}`,
    `Appliances: ${appliances.length}`,
    `Dry run: ${dryRun}`,
    "---",
  ];

  if (dryRun) {
    for (const c of clients) {
      const fields: string[] = [];
      if (c.name && !c.nameEnc) fields.push("name");
      if (c.email && !c.emailEnc) fields.push("email → emailEnc + emailHash");
      if (c.phone && !c.phoneEnc) fields.push("phone");
      if (c.deliveryAddress && !c.deliveryAddressEnc) fields.push("deliveryAddress");
      log.push(`Client ${c.id}: ${fields.length ? `would encrypt [${fields.join(", ")}]` : "nothing to do"}`);
    }
    for (const a of appliances) {
      if (a.cylinderSizeKg !== null && !a.cylinderSizeEnc) {
        log.push(`Appliance ${a.id}: would encrypt cylinderSizeKg=${a.cylinderSizeKg}`);
      } else {
        log.push(`Appliance ${a.id}: nothing to do`);
      }
    }
    log.push("---");
    log.push("Run with ?dryRun=false to execute.");
    return NextResponse.json({ ok: true, dryRun: true, log });
  }

  // Execute migration
  await prisma.vendor.update({
    where: { id: vendor.id },
    data: { encryptionOn: true, wrappedDataKey, keyHash: newKeyHash },
  });
  log.push(`✓ Vendor: encryptionOn=true, wrappedDataKey stored`);

  for (const c of clients) {
    const updates: Record<string, string | null> = {};

    if (c.name && !c.nameEnc) {
      updates.nameEnc = encryptField(c.name, dataKey);
      updates.name = null;
    }
    if (c.email && !c.emailEnc) {
      updates.emailEnc = encryptField(c.email, dataKey);
      updates.emailHash = hashEmail(c.email);
      updates.email = null;
    }
    if (c.phone && !c.phoneEnc) {
      updates.phoneEnc = encryptField(c.phone, dataKey);
      updates.phone = null;
    }
    if (c.deliveryAddress && !c.deliveryAddressEnc) {
      updates.deliveryAddressEnc = encryptField(c.deliveryAddress, dataKey);
      updates.deliveryAddress = null;
    }

    if (Object.keys(updates).length > 0) {
      await prisma.client.update({ where: { id: c.id }, data: updates });
      const encFields = Object.keys(updates).filter(k => k.endsWith("Enc") || k === "emailHash");
      log.push(`✓ Client ${c.id}: encrypted [${encFields.join(", ")}]`);
    } else {
      log.push(`- Client ${c.id}: nothing to encrypt`);
    }
  }

  for (const a of appliances) {
    if (a.cylinderSizeKg !== null && !a.cylinderSizeEnc) {
      await prisma.appliance.update({
        where: { id: a.id },
        data: {
          cylinderSizeEnc: encryptField(String(a.cylinderSizeKg), dataKey),
          cylinderSizeKg: null,
        },
      });
      log.push(`✓ Appliance ${a.id}: encrypted cylinderSizeKg=${a.cylinderSizeKg}`);
    } else {
      log.push(`- Appliance ${a.id}: nothing to encrypt`);
    }
  }

  log.push("---");
  log.push("Migration complete. Verify in Supabase that plaintext PII columns are NULL.");

  return NextResponse.json({ ok: true, dryRun: false, log });
}
