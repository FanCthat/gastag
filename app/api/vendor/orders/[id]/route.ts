import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { predictNextCycle, calcActualDurationMonths } from "@/lib/prediction";
import { scheduleNotificationsForCycle, cancelPendingNotificationsForCycle } from "@/lib/notifications";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY!); }
const FROM = "GasTag <noreply@mobwatch.co.za>";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

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
    const nextDates: { applianceType: string; cylinderSizeKg: number; nextEmptyDate: Date }[] = [];

    for (const item of order.orderItems) {
      const cycle = item.cylinderCycle;
      const appliance = item.appliance;

      const actualDuration = calcActualDurationMonths(cycle.createdAt, now);
      await prisma.cylinderCycle.update({
        where: { id: cycle.id },
        data: { status: "delivered", actualDeliveryDate: now, actualDurationMonths: actualDuration },
      });

      await cancelPendingNotificationsForCycle(appliance.id, ["6week", "3week", "duedate", "escalation"]);

      await prisma.escalationFlag.updateMany({
        where: { applianceId: appliance.id, clearedAt: null },
        data: { clearedAt: now, clearedByOrderId: orderId },
      });

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

      await scheduleNotificationsForCycle(
        order.clientId, appliance.id, newCycle.id, nextEmptyDate, order.client.notificationPreference
      );

      nextDates.push({ applianceType: appliance.applianceType, cylinderSizeKg: appliance.cylinderSizeKg, nextEmptyDate });
    }

    // Send delivery confirmation email to client
    const accountUrl = `${process.env.APP_BASE_URL}/account/${order.clientId}`;
    const cylinderLines = nextDates
      .map(d => `<li><strong>${d.cylinderSizeKg}kg ${d.applianceType.replace("_", " ")}</strong> — next predicted empty: <strong>${formatDate(d.nextEmptyDate)}</strong></li>`)
      .join("");

    try {
      await getResend().emails.send({
        from: FROM,
        to: order.client.email,
        subject: "Your gas has been delivered — next cycle started",
        html: `
          <p>Hi ${order.client.name.split(" ")[0]},</p>
          <p>Great news — your gas delivery has been confirmed! Here's a summary of your updated cylinders:</p>
          <ul>${cylinderLines}</ul>
          <p>We'll send you reminders well before each cylinder runs out, so you're never caught without gas.</p>
          <p><a href="${accountUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View my account →</a></p>
          <p>The GasTag Team</p>
        `,
      });
    } catch (e) {
      console.error("Delivery confirmation email failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
