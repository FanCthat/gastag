import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, suppressedAt: true, deviceToken: true },
  });

  if (!client || client.suppressedAt) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`gastag_device_${clientId}`)?.value ?? null;
  if (!client.deviceToken || cookieToken !== client.deviceToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: { notificationPreference: "none" },
    });
    await tx.notification.deleteMany({ where: { clientId, sentAt: null } });
  });

  return NextResponse.json({ ok: true });
}
