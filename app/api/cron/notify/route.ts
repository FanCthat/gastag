import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotificationEmail, sendEscalationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let sent = 0;
  let escalations = 0;

  // Find all unsent notifications due now or past
  const due = await prisma.notification.findMany({
    where: { sentAt: null, scheduledFor: { lte: now } },
    include: {
      client: { select: { id: true, name: true, email: true } },
      appliance: { select: { applianceType: true, cylinderSizeKg: true } },
    },
    orderBy: { scheduledFor: "asc" },
    take: 200,
  });

  for (const notif of due) {
    const { client, appliance } = notif;
    if (!client || !appliance) {
      await prisma.notification.update({ where: { id: notif.id }, data: { sentAt: now } });
      continue;
    }

    // Find the active cycle for this appliance
    const cycle = await prisma.cylinderCycle.findFirst({
      where: { applianceId: notif.applianceId ?? undefined, status: { in: ["active", "ordered"] } },
      orderBy: { createdAt: "desc" },
    });

    const reorderUrl = `${process.env.APP_BASE_URL}/reorder/${client.id ?? ""}`;
    const vars = {
      clientName: client.name,
      clientEmail: client.email,
      applianceType: appliance.applianceType,
      cylinderSizeKg: String(appliance.cylinderSizeKg),
      predictedEmptyDate: cycle ? formatDate(cycle.predictedEmptyDate) : "soon",
      reorderUrl,
      daysOverdue: cycle
        ? String(Math.ceil((now.getTime() - new Date(cycle.predictedEmptyDate).getTime()) / (1000 * 60 * 60 * 24)))
        : "21+",
    };

    if (notif.type === "escalation") {
      // Create escalation flag if none exists
      if (notif.applianceId) {
        const existing = await prisma.escalationFlag.findFirst({
          where: { applianceId: notif.applianceId, clearedAt: null },
        });
        if (!existing) {
          await prisma.escalationFlag.create({
            data: {
              applianceId: notif.applianceId,
              vendorId: (await prisma.client.findUnique({ where: { id: notif.clientId }, select: { vendorId: true } }))?.vendorId ?? "",
            },
          });
          escalations++;
        }
      }
      await sendEscalationEmail(vars);
    } else {
      // Send via email
      if (notif.channel === "email" || notif.channel === "both") {
        await sendNotificationEmail(notif.type, client.email, vars);
      }
      // TODO: push channel when push subscriptions are wired up
    }

    await prisma.notification.update({ where: { id: notif.id }, data: { sentAt: now } });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, escalations });
}
