import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { predictCycle1 } from "@/lib/prediction";
import { scheduleNotificationsForCycle } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const { clientId, applianceType, cylinderSizeKg, clientEstimatedDurationMonths } = await req.json();

  if (!clientId || !applianceType || !cylinderSizeKg) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const now = new Date();
  const { predictedEmptyDate, baselineUsed } = await predictCycle1(
    now,
    cylinderSizeKg,
    clientEstimatedDurationMonths ?? null
  );

  const appliance = await prisma.appliance.create({
    data: { clientId, applianceType, cylinderSizeKg },
  });

  const cycle = await prisma.cylinderCycle.create({
    data: {
      applianceId: appliance.id,
      cycleNumber: 1,
      baselineUsed,
      predictedEmptyDate,
    },
  });

  await scheduleNotificationsForCycle(
    clientId,
    appliance.id,
    cycle.id,
    predictedEmptyDate,
    client.notificationPreference
  );

  return NextResponse.json({ applianceId: appliance.id, cycleId: cycle.id }, { status: 201 });
}
