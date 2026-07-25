import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { predictNextCycle, calcActualDurationMonths } from "@/lib/prediction";
import { scheduleNotificationsForCycle, cancelPendingNotificationsForCycle } from "@/lib/notifications";

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await getServerSession(authOptions);
  const vendorId = (session?.user as any)?.id;
  if (!vendorId || (session?.user as any)?.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { isActive: true } });
  if (!vendor?.isActive) {
    return NextResponse.json({ error: "Vendor account is not active." }, { status: 403 });
  }

  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      appliances: {
        where: { isActive: true },
        include: {
          cylinderCycles: {
            where: { status: "active" },
            orderBy: { cycleNumber: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!client || client.vendorId !== vendorId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  let recorded = 0;

  for (const appliance of client.appliances) {
    const cycle = appliance.cylinderCycles[0];
    if (!cycle || cycle.predictedEmptyDate > now) continue;

    const actualDuration = calcActualDurationMonths(cycle.createdAt, now);

    await prisma.cylinderCycle.update({
      where: { id: cycle.id },
      data: { status: "delivered", actualDeliveryDate: now, actualDurationMonths: actualDuration },
    });

    await prisma.escalationFlag.updateMany({
      where: { applianceId: appliance.id, clearedAt: null },
      data: { clearedAt: now },
    });

    await cancelPendingNotificationsForCycle(appliance.id, ["6week", "3week", "duedate", "escalation"]);

    // Cycle 1 is always a partial cylinder — exclude from rolling average.
    // Query after the update so the just-closed cycle's actualDurationMonths is included
    // if it is cycle 2+.
    const pastCycles = await prisma.cylinderCycle.findMany({
      where: { applianceId: appliance.id, cycleNumber: { gt: 1 } },
      select: { actualDurationMonths: true },
    });
    const completedCycles = pastCycles.map(c => ({ actualDurationMonths: c.actualDurationMonths }));

    const nextEmptyDate = await predictNextCycle(now, completedCycles, appliance.cylinderSizeKg);

    const cycleCount = await prisma.cylinderCycle.count({ where: { applianceId: appliance.id } });

    const newCycle = await prisma.cylinderCycle.create({
      data: {
        applianceId: appliance.id,
        cycleNumber: cycleCount + 1,
        baselineUsed: "industry_average",
        predictedEmptyDate: nextEmptyDate,
      },
    });

    await scheduleNotificationsForCycle(
      clientId, appliance.id, newCycle.id, nextEmptyDate, client.notificationPreference
    );

    recorded++;
  }

  if (recorded === 0) {
    return NextResponse.json({ error: "No overdue cycles found for this client." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, recorded });
}
