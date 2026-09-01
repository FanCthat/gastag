import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVendorDataKey, resolveField } from "@/lib/client-crypto";
import { cookies } from "next/headers";
import { createHash, randomBytes } from "crypto";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone.trim().replace(/\s/g, "")).digest("hex");
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const { phone } = await req.json().catch(() => ({}));

  if (!phone?.trim()) {
    return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      suppressedAt: true,
      phoneHash: true,
      phoneVerifyAttempts: true,
      phoneVerifyLockedUntil: true,
      name: true, nameEnc: true,
      email: true, emailEnc: true,
      phone: true, phoneEnc: true,
      deliveryAddress: true, deliveryAddressEnc: true,
      qrCode: { select: { id: true, state: true } },
      vendor: { select: { name: true, encryptionOn: true, wrappedDataKey: true } },
    },
  });

  if (!client || client.suppressedAt) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Rate limit check.
  if (
    client.phoneVerifyAttempts >= MAX_ATTEMPTS &&
    client.phoneVerifyLockedUntil &&
    client.phoneVerifyLockedUntil > new Date()
  ) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }

  // Reset counter if lock has expired.
  if (client.phoneVerifyLockedUntil && client.phoneVerifyLockedUntil <= new Date()) {
    await prisma.client.update({
      where: { id: clientId },
      data: { phoneVerifyAttempts: 0, phoneVerifyLockedUntil: null },
    });
  }

  const entered = hashPhone(phone);
  // Primary: compare against stored hash. Fallback: plain-text compare for
  // legacy records where phoneHash was never backfilled, and backfill on match.
  let match = false;
  if (client.phoneHash) {
    match = entered === client.phoneHash;
  } else if (client.phone) {
    const normalStored = client.phone.trim().replace(/\s/g, "");
    const normalEntered = phone.trim().replace(/\s/g, "");
    match = normalEntered === normalStored;
    if (match) {
      // Backfill phoneHash so future verifications use the hash path.
      await prisma.client.update({
        where: { id: clientId },
        data: { phoneHash: entered },
      });
    }
  }

  if (!match) {
    const attempts = (client.phoneVerifyAttempts ?? 0) + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await prisma.client.update({
      where: { id: clientId },
      data: {
        phoneVerifyAttempts: attempts,
        phoneVerifyLockedUntil: locked
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : null,
      },
    });
    return NextResponse.json(
      { error: "That doesn't match our records. Please check and try again." },
      { status: 403 }
    );
  }

  // Passed — reset rate limit, set device token, register QR if still pre_registered.
  const deviceToken = randomBytes(32).toString("hex");
  const needsRegistration = client.qrCode.state === "pre_registered";

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: {
        deviceToken,
        confirmedAt: new Date(),
        phoneVerifyAttempts: 0,
        phoneVerifyLockedUntil: null,
      },
    });
    if (needsRegistration) {
      await tx.qRCode.updateMany({
        where: { client: { id: clientId } },
        data: { state: "registered", registeredAt: new Date() },
      });
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(`gastag_device_${clientId}`, deviceToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 5,
    path: "/",
  });

  // Return decrypted data for the form — only after passing the challenge.
  const dataKey = (client.vendor.encryptionOn && client.vendor.wrappedDataKey)
    ? getVendorDataKey(client.vendor.wrappedDataKey)
    : null;

  return NextResponse.json({
    vendorName: client.vendor.name,
    name: resolveField(client.nameEnc, client.name, dataKey),
    phone: resolveField(client.phoneEnc, client.phone, dataKey),
    email: resolveField(client.emailEnc, client.email, dataKey) || null,
    deliveryAddress: resolveField(client.deliveryAddressEnc, client.deliveryAddress, dataKey),
  });
}
