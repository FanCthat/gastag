import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVendorDataKey, encryptField, hashEmail, resolveField } from "@/lib/client-crypto";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

export const runtime = "nodejs";

function hashPhone(phone: string): string {
  return createHash("sha256").update(phone.trim().replace(/\s/g, "")).digest("hex");
}

// GET — returns resolved client details for the confirm form (only if trusted device or after neutral step).
// The neutral-step gate is enforced client-side; this route is called only when the user chooses to proceed.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true, nameEnc: true,
      email: true, emailEnc: true,
      phone: true, phoneEnc: true,
      deliveryAddress: true, deliveryAddressEnc: true,
      deviceToken: true,
      suppressedAt: true,
      vendor: {
        select: { name: true, encryptionOn: true, wrappedDataKey: true },
      },
      appliances: {
        where: { isActive: true },
        select: {
          id: true, applianceType: true,
          cylinderSizeKg: true, cylinderSizeEnc: true,
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (client.suppressedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dataKey = (client.vendor.encryptionOn && client.vendor.wrappedDataKey)
    ? getVendorDataKey(client.vendor.wrappedDataKey)
    : null;

  return NextResponse.json({
    vendorName: client.vendor.name,
    name: resolveField(client.nameEnc, client.name, dataKey),
    email: resolveField(client.emailEnc, client.email, dataKey) || null,
    phone: resolveField(client.phoneEnc, client.phone, dataKey),
    deliveryAddress: resolveField(client.deliveryAddressEnc, client.deliveryAddress, dataKey),
  });
}

// POST — saves the client's edits and sets the trusted-device cookie.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;
  const { name, phone, email, deliveryAddress } = await req.json();

  if (!name || !phone || !deliveryAddress) {
    return NextResponse.json({ error: "Name, phone, and delivery address are required." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true, suppressedAt: true,
      vendor: { select: { encryptionOn: true, wrappedDataKey: true } },
    },
  });
  if (!client || client.suppressedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dataKey = (client.vendor.encryptionOn && client.vendor.wrappedDataKey)
    ? getVendorDataKey(client.vendor.wrappedDataKey)
    : null;

  const normalName = name.trim();
  const normalPhone = phone.trim();
  const normalEmail = email?.trim().toLowerCase() || null;
  const normalAddress = deliveryAddress.trim();

  // Generate a fresh device token — stored in the DB and as a cookie on the client's phone.
  const deviceToken = randomBytes(32).toString("hex");

  await prisma.client.update({
    where: { id: clientId },
    data: {
      name:               dataKey ? null : normalName,
      nameEnc:            dataKey ? encryptField(normalName, dataKey) : null,
      email:              (normalEmail && !dataKey) ? normalEmail : null,
      emailEnc:           (normalEmail && dataKey)  ? encryptField(normalEmail, dataKey) : null,
      emailHash:          normalEmail ? hashEmail(normalEmail) : null,
      phone:              dataKey ? null : normalPhone,
      phoneEnc:           dataKey ? encryptField(normalPhone, dataKey) : null,
      phoneHash:          hashPhone(normalPhone),
      deliveryAddress:    dataKey ? null : normalAddress,
      deliveryAddressEnc: dataKey ? encryptField(normalAddress, dataKey) : null,
      confirmedAt:        new Date(),
      deviceToken,
    },
  });

  // Update QR state to registered now that the client has confirmed
  await prisma.qRCode.updateMany({
    where: { client: { id: clientId } },
    data: { state: "registered" },
  });

  const cookieStore = await cookies();
  cookieStore.set(`gastag_device_${clientId}`, deviceToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365 * 5, // 5 years
    path: "/",
  });

  return NextResponse.json({ ok: true });
}
