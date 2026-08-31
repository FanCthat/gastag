import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, suppressedAt: true },
  });

  if (!client || client.suppressedAt) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.client.update({
      where: { id: clientId },
      data: { notificationPreference: "none" },
    }),
    // Delete pending notifications so nothing fires while muted.
    prisma.notification.deleteMany({
      where: { clientId, sentAt: null },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
