import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVendorDataKey, encryptField, hashEmail, hashPhone } from "@/lib/client-crypto";

export const dynamic = "force-dynamic";

const VALID_PREFS = ["email", "push", "both"] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { name, email, phone, notificationPreference } = body as {
    name?: string;
    email?: string;
    phone?: string;
    notificationPreference?: string;
  };

  if (!name?.trim()) return NextResponse.json({ error: "Name is required." }, { status: 400 });
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 });
  }
  if (notificationPreference && !VALID_PREFS.includes(notificationPreference as (typeof VALID_PREFS)[number])) {
    return NextResponse.json({ error: "Invalid notification preference." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, vendor: { select: { encryptionOn: true, wrappedDataKey: true } } },
  });
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const dataKey = (client.vendor.encryptionOn && client.vendor.wrappedDataKey)
    ? getVendorDataKey(client.vendor.wrappedDataKey)
    : null;

  const normalName  = name.trim();
  const normalEmail = email.trim().toLowerCase();
  const normalPhone = phone?.trim() || null;

  // Only include phone in the update when a value was actually supplied.
  // An absent or empty phone means "unchanged" — never overwrite with null.
  const phoneFields = normalPhone
    ? (dataKey
        ? { phone: null as null, phoneEnc: encryptField(normalPhone, dataKey), phoneHash: hashPhone(normalPhone) }
        : { phone: normalPhone, phoneEnc: null as null, phoneHash: hashPhone(normalPhone) })
    : {};

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: {
      ...(dataKey ? {
        name:     null,
        nameEnc:  encryptField(normalName, dataKey),
        email:    null,
        emailEnc: encryptField(normalEmail, dataKey),
      } : {
        name:  normalName,
        email: normalEmail,
      }),
      ...phoneFields,
      emailHash: hashEmail(normalEmail),
      ...(notificationPreference ? { notificationPreference } : {}),
    },
    select: { name: true, nameEnc: true, email: true, emailEnc: true, phone: true, phoneEnc: true, notificationPreference: true },
  });

  return NextResponse.json({ ok: true, client: updated });
}
