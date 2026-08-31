import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendNotificationEmail, sendEscalationEmail } from "@/lib/email";
import { getVendorDataKey, resolveField, resolveCylinderSize } from "@/lib/client-crypto";

export const dynamic = "force-dynamic";

const TRIAL_OFFSETS: Record<string, string> = {
  "6week":   "6 weeks before their cylinder is predicted to run out",
  "3week":   "3 weeks before their cylinder is predicted to run out",
  "duedate": "on the day their cylinder is predicted to run out",
};

function buildTrialBanner(type: string): string {
  const offset = TRIAL_OFFSETS[type];
  if (!offset) return "";
  return `
    <div style="background:#fff3cd;border-left:4px solid #d4a017;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#5a4500;font-family:sans-serif;line-height:1.6;">
      🔬 <strong>You're in a GasTag trial.</strong> In live operation this email is received by your clients <strong>${offset}</strong>.
      Aside from the timing, this is <em>exactly</em> what your real clients will receive.
    </div>`;
}

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
      client: { select: { id: true, name: true, nameEnc: true, email: true, emailEnc: true, notificationPreference: true, vendor: { select: { isTrial: true, encryptionOn: true, wrappedDataKey: true } } } },
      appliance: { select: { applianceType: true, cylinderSizeKg: true, cylinderSizeEnc: true } },
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

    // Customer has muted all notifications — mark sent without emailing.
    // Future: when push is live this check needs to be per-channel.
    if (client.notificationPreference === "none") {
      await prisma.notification.update({ where: { id: notif.id }, data: { sentAt: now } });
      log.push(`${notif.type}: skipped — client ${client.id} has notifications muted`);
      continue;
    }

    // Find the active cycle for this appliance
    const cycle = await prisma.cylinderCycle.findFirst({
      where: { applianceId: notif.applianceId ?? undefined, status: { in: ["active", "ordered"] } },
      orderBy: { createdAt: "desc" },
    });

    const reorderUrl = `${process.env.APP_BASE_URL}/reorder/${client.id ?? ""}`;
    const dataKey = (client.vendor?.encryptionOn && client.vendor?.wrappedDataKey)
      ? getVendorDataKey(client.vendor.wrappedDataKey)
      : null;
    const clientName  = resolveField(client.nameEnc,  client.name,  dataKey);
    const clientEmail = resolveField(client.emailEnc, client.email, dataKey);
    const vars = {
      clientName,
      clientEmail,
      applianceType: appliance.applianceType,
      cylinderSizeKg: String(resolveCylinderSize(appliance.cylinderSizeKg, appliance.cylinderSizeEnc ?? null, dataKey)),
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
            select: { vendorId: true, vendor: { select: { contactEmail: true, isActive: true } } },
          });
          if (clientRecord?.vendorId && clientRecord.vendor.isActive) {
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
            log.push(`escalation: skipped — vendor inactive or not found for client ${notif.clientId}`);
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
          const trialBanner = client.vendor?.isTrial ? buildTrialBanner(notif.type) : undefined;
          const ok = await sendNotificationEmail(notif.type, clientEmail, vars, trialBanner);
          log.push(`${notif.type}: ${ok ? "sent" : "template missing"} → ${clientEmail}${client.vendor?.isTrial ? " [trial banner]" : ""}`);
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
