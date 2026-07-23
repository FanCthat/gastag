import { prisma } from "@/lib/db";

interface TrialContext {
  isTrial: boolean;
  trialStartedAt: Date | null;
}

export async function scheduleNotificationsForCycle(
  clientId: string,
  applianceId: string,
  cylinderCycleId: string,
  predictedEmptyDate: Date,
  channel: string,
  trialContext?: TrialContext
) {
  const now = new Date();

  // Trial mode: compressed schedule anchored to trialStartedAt, no escalation.
  if (trialContext?.isTrial && trialContext.trialStartedAt) {
    const anchor = trialContext.trialStartedAt.getTime();
    const trialJobs = [
      { type: "6week",   offsetHours: 48  },
      { type: "3week",   offsetHours: 96  },
      { type: "duedate", offsetHours: 144 },
    ];
    for (const job of trialJobs) {
      const scheduledFor = new Date(anchor + job.offsetHours * 60 * 60 * 1000);
      if (scheduledFor <= now) continue;
      await prisma.notification.create({
        data: { clientId, applianceId, type: job.type, scheduledFor, channel },
      });
    }
    return;
  }

  // Live mode: standard offsets from predictedEmptyDate.
  const liveJobs = [
    { type: "6week",     offsetDays: -42 },
    { type: "3week",     offsetDays: -21 },
    { type: "duedate",   offsetDays: 0   },
    { type: "escalation", offsetDays: 21 },
  ];

  for (const job of liveJobs) {
    const scheduledFor = new Date(predictedEmptyDate);
    scheduledFor.setDate(scheduledFor.getDate() + job.offsetDays);

    if (scheduledFor <= now) continue;

    await prisma.notification.create({
      data: {
        clientId,
        applianceId,
        type: job.type,
        scheduledFor,
        channel: job.type === "escalation" ? "internal" : channel,
      },
    });
  }
}

export async function cancelPendingNotificationsForCycle(
  applianceId: string,
  typesToCancel: string[]
) {
  await prisma.notification.deleteMany({
    where: {
      applianceId,
      type: { in: typesToCancel },
      sentAt: null,
    },
  });
}
