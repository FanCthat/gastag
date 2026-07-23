import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const updated = await prisma.client.update({
    where: { id: clientId },
    data: {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      ...(notificationPreference ? { notificationPreference } : {}),
    },
    select: { name: true, email: true, phone: true, notificationPreference: true },
  });

  return NextResponse.json({ ok: true, client: updated });
}
