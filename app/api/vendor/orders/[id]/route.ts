import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { predictNextCycle, calcActualDurationMonths } from "@/lib/prediction";
import { scheduleNotificationsForCycle, cancelPendingNotificationsForCycle } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { getVendorDataKey, resolveField, resolveCylinderSize } from "@/lib/client-crypto";

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

  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { isActive: true, encryptionOn: true, wrappedDataKey: true } });
  if (!vendor?.isActive) {
    return NextResponse.json({ error: "Vendor account is not active." }, { status: 403 });
  }

  const dataKey = (vendor.encryptionOn && vendor.wrappedDataKey)
    ? getVendorDataKey(vendor.wrappedDataKey)
    : null;

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

      // Cycle 1 is always partial — the client registered mid-use, so its duration
      // reflects how much gas was left at registration, not a full cylinder. Only
      // cycle 2+ are full cylinders and valid baselines for prediction.
      const completedCycles = appliance.cylinderCycles
        .filter(c => c.cycleNumber > 1)
        .map(c => ({ actualDurationMonths: c.actualDurationMonths }));
      if (cycle.cycleNumber > 1) {
        completedCycles.push({ actualDurationMonths: actualDuration });
      }

      const resolvedKg = resolveCylinderSize(appliance.cylinderSizeKg, appliance.cylinderSizeEnc ?? null, dataKey);
      const nextEmptyDate = await predictNextCycle(now, completedCycles, resolvedKg);
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

      nextDates.push({ applianceType: appliance.applianceType, cylinderSizeKg: resolvedKg, nextEmptyDate });
    }

    const clientName  = resolveField(order.client.nameEnc,  order.client.name,  dataKey);
    const clientEmail = resolveField(order.client.emailEnc, order.client.email, dataKey);

    const accountUrl = `${process.env.APP_BASE_URL}/account/${order.clientId}`;
    const cylinderLines = nextDates
      .map(d => `<li><strong>${d.cylinderSizeKg}kg ${d.applianceType.replace("_", " ")}</strong> — next predicted empty: <strong>${formatDate(d.nextEmptyDate)}</strong></li>`)
      .join("");

    const isCollection = order.fulfilmentType === "collection";
    const emailSubject = isCollection
      ? "Your gas cylinder has been collected — next cycle started"
      : "Your gas has been delivered — next cycle started";
    const emailIntro = isCollection
      ? "Great news — your cylinder collection has been confirmed! Here's a summary of your updated cylinders:"
      : "Great news — your gas delivery has been confirmed! Here's a summary of your updated cylinders:";

    try {
      await sendEmail({
        to: clientEmail,
        subject: emailSubject,
        from: FROM,
        html: `
          <p>Hi ${clientName.split(" ")[0]},</p>
          <p>${emailIntro}</p>
          <ul>${cylinderLines}</ul>
          <p>We'll send you reminders well before each cylinder runs out, so you're never caught without gas.</p>
          <p><a href="${accountUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View my account →</a></p>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px">Need help? Call or WhatsApp <a href="tel:+27824993552">+27 82 499 3552</a></p>
        `,
      });
    } catch (e) {
      console.error("Confirmation email failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
