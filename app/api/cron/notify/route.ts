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
  const log: string[] = [];

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

  log.push(`Found ${due.length} due notification(s)`);

  for (const notif of due) {
    const { client, appliance } = notif;
    if (!client || !appliance) {
      await prisma.notification.update({ where: { id: notif.id }, data: { sentAt: now } });
      log.push(`${notif.type}: skipped — missing client or appliance`);
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
      let vendorEmail: string | null = null;
      if (notif.applianceId) {
        const existing = await prisma.escalationFlag.findFirst({
          where: { applianceId: notif.applianceId, clearedAt: null },
        });
        if (!existing) {
          const clientRecord = await prisma.client.findUnique({
            where: { id: notif.clientId },
            select: { vendorId: true, vendor: { select: { contactEmail: true } } },
          });
          if (clientRecord?.vendorId) {
            vendorEmail = clientRecord.vendor.contactEmail;
            try {
              await prisma.escalationFlag.create({
                data: { applianceId: notif.applianceId, vendorId: clientRecord.vendorId },
              });
              escalations++;
            } catch (err: any) {
              log.push(`escalation: flag create FAILED — ${err.message}`);
            }
          } else {
            log.push(`escalation: skipped flag — no vendor found for client ${notif.clientId}`);
          }
        }
      }
      if (vendorEmail) {
        try {
          await sendEscalationEmail(vars, vendorEmail);
          log.push(`escalation: sent to supplier ${vendorEmail} for ${client.name}`);
        } catch (err: any) {
          log.push(`escalation: FAILED — ${err.message}`);
        }
      } else {
        log.push(`escalation: skipped email — no vendor email found for ${client.name}`);
      }
    } else {
      if (notif.channel === "email" || notif.channel === "both") {
        try {
          const ok = await sendNotificationEmail(notif.type, client.email, vars);
          log.push(`${notif.type}: ${ok ? "sent" : "template missing"} → ${client.email}`);
        } catch (err: any) {
          log.push(`${notif.type}: FAILED — ${err.message}`);
        }
      } else {
        log.push(`${notif.type}: skipped — channel is ${notif.channel}`);
      }
    }

    await prisma.notification.update({ where: { id: notif.id }, data: { sentAt: now } });
    sent++;
  }

  return NextResponse.json({ ok: true, sent, escalations, log });
}
