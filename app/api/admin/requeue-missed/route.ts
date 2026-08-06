import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// One-off recovery: re-queues exactly one notification per appliance based on
// where that appliance sits in its current cycle RIGHT NOW.
//
// Rules:
//   daysUntilEmpty <= 0            → queue "duedate" + "escalation"
//   0 < daysUntilEmpty <= 21       → queue "3week"
//   21 < daysUntilEmpty <= 42      → queue "6week"
//   > 42 days                      → skip (cron will handle future ones fine)
//
// A type is only re-queued if an earlier notification of that type was already
// marked sent (sentAt IS NOT NULL) — meaning it was silently swallowed during
// the Resend API key outage.  Unsent notifications are left untouched.

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const in21Days = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const in42Days = new Date(now.getTime() + 42 * 24 * 60 * 60 * 1000);
  const fireAt = new Date(now.getTime() + 10_000);

  const log: string[] = [];
  let queued = 0;

  // All appliances that have an active/ordered cycle
  const appliances = await prisma.appliance.findMany({
    where: { isActive: true },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          notificationPreference: true,
          vendor: { select: { isActive: true } },
        },
      },
      cylinderCycles: {
        where: { status: { in: ["active", "ordered"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      notifications: {
        orderBy: { scheduledFor: "desc" },
      },
    },
  });

  for (const appliance of appliances) {
    const cycle = appliance.cylinderCycles[0];
    if (!cycle) continue;
    if (!appliance.client.vendor.isActive) continue;

    const { client } = appliance;
    const daysUntilEmpty = Math.ceil(
      (new Date(cycle.predictedEmptyDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const neededTypes: string[] = [];
    if (daysUntilEmpty <= 0) {
      neededTypes.push("duedate", "escalation");
    } else if (daysUntilEmpty <= 21) {
      neededTypes.push("3week");
    } else if (daysUntilEmpty <= 42) {
      neededTypes.push("6week");
    } else {
      log.push(`${client.name} (${appliance.applianceType}): ${daysUntilEmpty}d away — skip`);
      continue;
    }

    for (const type of neededTypes) {
      const notifs = appliance.notifications.filter(n => n.type === type);
      const hasUnsent = notifs.some(n => n.sentAt === null);
      const hasSent = notifs.some(n => n.sentAt !== null);

      if (hasUnsent) {
        log.push(`${client.name} / ${type}: already unsent in queue — skip`);
        continue;
      }
      if (!hasSent) {
        log.push(`${client.name} / ${type}: no prior notification found — skip`);
        continue;
      }

      // Prior notification was "sent" (silently failed) — re-queue
      const channel = type === "escalation"
        ? "internal"
        : (client.notificationPreference ?? "email");

      await prisma.notification.create({
        data: {
          clientId: client.id,
          applianceId: appliance.id,
          type,
          scheduledFor: fireAt,
          channel,
        },
      });
      queued++;
      log.push(`${client.name} (${appliance.applianceType}) / ${type}: QUEUED (${daysUntilEmpty}d until empty)`);
    }
  }

  return NextResponse.json({
    ok: true,
    queued,
    log,
    nextStep: `Now visit: ${process.env.APP_BASE_URL}/api/cron/notify?secret=${secret}`,
  });
}
