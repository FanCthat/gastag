import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      suppressedAt: true,
      qrCode: { select: { id: true, state: true } },
    },
  });

  if (!client || client.suppressedAt) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // If the client mutes before completing confirm (QR still pre_registered),
  // treat mute as completion of registration so subsequent scans go to /account.
  const needsRegistration = client.qrCode.state === "pre_registered";
  const deviceToken = needsRegistration ? randomBytes(32).toString("hex") : null;

  await prisma.$transaction(async (tx) => {
    await tx.client.update({
      where: { id: clientId },
      data: {
        notificationPreference: "none",
        ...(deviceToken ? { deviceToken, confirmedAt: new Date() } : {}),
      },
    });
    await tx.notification.deleteMany({ where: { clientId, sentAt: null } });
    if (needsRegistration) {
      await tx.qRCode.update({
        where: { id: client.qrCode.id },
        data: { state: "registered", registeredAt: new Date() },
      });
    }
  });

  const response = NextResponse.json({ ok: true });

  if (deviceToken) {
    response.cookies.set(`gastag_device_${clientId}`, deviceToken, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 365 * 5,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}
