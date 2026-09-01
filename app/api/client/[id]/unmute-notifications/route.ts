import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { scheduleNotificationsForCycle } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      suppressedAt: true,
      deviceToken: true,
      appliances: {
        where: { isActive: true },
        select: {
          id: true,
          cylinderCycles: {
            where: { status: "active" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true, predictedEmptyDate: true },
          },
        },
      },
      vendor: { select: { isTrial: true, trialStartedAt: true } },
    },
  });

  if (!client || client.suppressedAt) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`gastag_device_${clientId}`)?.value ?? null;
  if (!client.deviceToken || cookieToken !== client.deviceToken) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  // Re-enable preference.
  await prisma.client.update({
    where: { id: clientId },
    data: { notificationPreference: "email" },
  });

  // Clear any stale pending notifications then re-schedule from active cycles.
  // scheduleNotificationsForCycle skips dates already in the past.
  // Future: when push is live, restore the original channel preference rather than hardcoding "email".
  await prisma.notification.deleteMany({ where: { clientId, sentAt: null } });

  for (const appliance of client.appliances) {
    const cycle = appliance.cylinderCycles[0];
    if (cycle) {
      await scheduleNotificationsForCycle(
        clientId,
        appliance.id,
        cycle.id,
        cycle.predictedEmptyDate,
        "email",
        { isTrial: client.vendor.isTrial, trialStartedAt: client.vendor.trialStartedAt },
      );
    }
  }

  return NextResponse.json({ ok: true });
}
