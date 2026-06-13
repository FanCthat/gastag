import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cancelPendingNotificationsForCycle } from "@/lib/notifications";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: applianceId } = await params;
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "Missing clientId." }, { status: 400 });
  }

  const appliance = await prisma.appliance.findUnique({
    where: { id: applianceId },
    select: { id: true, clientId: true },
  });

  if (!appliance || appliance.clientId !== clientId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await cancelPendingNotificationsForCycle(applianceId, ["6week", "3week", "duedate", "escalation"]);

  await prisma.appliance.update({
    where: { id: applianceId },
    data: { isActive: false },
  });

  return NextResponse.json({ ok: true });
}
