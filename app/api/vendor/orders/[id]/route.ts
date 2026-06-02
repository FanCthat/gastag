import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { predictNextCycle, calcActualDurationMonths } from "@/lib/prediction";
import { scheduleNotificationsForCycle, cancelPendingNotificationsForCycle } from "@/lib/notifications";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const vendorId = (session?.user as any)?.id;
  if (!vendorId || (session?.user as any)?.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: orderId } = await params;
  const { status } = await req.json();

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        include: {
          appliance: { include: { cylinderCycles: { orderBy: { cycleNumber: "asc" } } } },
          cylinderCycle: true,
        },
      },
      client: true,
    },
  });

  if (!order || order.vendorId !== vendorId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();

  await prisma.order.update({
    where: { id: orderId },
    data: { status, deliveredAt: status === "delivered" ? now : undefined },
  });

  if (status === "delivered") {
    for (const item of order.orderItems) {
      const cycle = item.cylinderCycle;
      const appliance = item.appliance;

      // Close current cycle
      const actualDuration = calcActualDurationMonths(cycle.createdAt, now);
      await prisma.cylinderCycle.update({
        where: { id: cycle.id },
        data: { status: "delivered", actualDeliveryDate: now, actualDurationMonths: actualDuration },
      });

      // Cancel remaining notifications for this cycle
      await cancelPendingNotificationsForCycle(appliance.id, ["6week", "3week", "duedate", "escalation"]);

      // Clear any open escalation flags
      await prisma.escalationFlag.updateMany({
        where: { applianceId: appliance.id, clearedAt: null },
        data: { clearedAt: now, clearedByOrderId: orderId },
      });

      // Create next cycle
      const completedCycles = appliance.cylinderCycles.map(c => ({
        actualDurationMonths: c.actualDurationMonths,
      }));
      completedCycles.push({ actualDurationMonths: actualDuration });

      const nextEmptyDate = predictNextCycle(now, completedCycles);
      const nextCycleNumber = appliance.cylinderCycles.length + 1;

      const newCycle = await prisma.cylinderCycle.create({
        data: {
          applianceId: appliance.id,
          cycleNumber: nextCycleNumber,
          baselineUsed: "rolling_average",
          predictedEmptyDate: nextEmptyDate,
        },
      });

      // Schedule notifications for next cycle
      await scheduleNotificationsForCycle(
        order.clientId,
        appliance.id,
        newCycle.id,
        nextEmptyDate,
        order.client.notificationPreference
      );
    }
  }

  return NextResponse.json({ ok: true });
}
