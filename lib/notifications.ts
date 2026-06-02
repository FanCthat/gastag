import { prisma } from "@/lib/db";

export async function scheduleNotificationsForCycle(
  clientId: string,
  applianceId: string,
  cylinderCycleId: string,
  predictedEmptyDate: Date,
  channel: string
) {
  const jobs = [
    { type: "6week", offsetDays: -42 },
    { type: "3week", offsetDays: -21 },
    { type: "duedate", offsetDays: 0 },
    { type: "escalation", offsetDays: 21 },
  ];

  for (const job of jobs) {
    const scheduledFor = new Date(predictedEmptyDate);
    scheduledFor.setDate(scheduledFor.getDate() + job.offsetDays);

    // Only schedule future notifications
    if (scheduledFor <= new Date()) continue;

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
