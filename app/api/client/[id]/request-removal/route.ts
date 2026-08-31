import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, suppressedAt: true, removalRequestedAt: true },
  });
  if (!client || client.suppressedAt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (client.removalRequestedAt) return NextResponse.json({ ok: true }); // idempotent

  await prisma.client.update({
    where: { id: clientId },
    data: { removalRequestedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
