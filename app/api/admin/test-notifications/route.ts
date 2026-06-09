import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sets up test notifications so they fire on the very next cron run.
// Usage:
//   ?secret=XXX&email=client@email.com   — find client by email
//   ?secret=XXX&clientId=cxxx            — find client by id
//
// Deletes any pending (unsent) notifications for the client's appliances,
// then creates all four types scheduled 10 seconds from now.
// After calling this, immediately trigger /api/cron/notify?secret=XXX
// and all four reminder emails will arrive.

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?list=1 — show all registered clients so you can find the right one
  if (req.nextUrl.searchParams.get("list") === "1") {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true, vendor: { select: { name: true } } },
      take: 50,
    });
    return NextResponse.json({ clients });
  }

  const email = req.nextUrl.searchParams.get("email");
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!email && !clientId) {
    return NextResponse.json(
      { error: "Provide ?email= or ?clientId=  (or ?list=1 to see all clients)" },
      { status: 400 }
    );
  }

  const client = await prisma.client.findFirst({
    where: email ? { email } : { id: clientId! },
    include: {
      appliances: {
        where: { isActive: true },
        include: {
          cylinderCycles: {
            where: { status: { in: ["active", "ordered"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const appliancesWithCycles = client.appliances.filter(
    a => a.cylinderCycles.length > 0
  );

  if (appliancesWithCycles.length === 0) {
    return NextResponse.json({ error: "No active cylinder cycles found for this client" }, { status: 400 });
  }

  const fireAt = new Date(Date.now() + 10_000); // 10 seconds from now
  const types = ["6week", "3week", "duedate", "escalation"] as const;
  let created = 0;
  let deleted = 0;

  for (const appliance of appliancesWithCycles) {
    // Remove existing unsent notifications for this appliance
    const del = await prisma.notification.deleteMany({
      where: { applianceId: appliance.id, sentAt: null },
    });
    deleted += del.count;

    // Create all four types firing at the same time
    for (const type of types) {
      await prisma.notification.create({
        data: {
          clientId: client.id,
          applianceId: appliance.id,
          type,
          scheduledFor: fireAt,
          channel: type === "escalation" ? "internal" : client.notificationPreference,
        },
      });
      created++;
    }
  }

  return NextResponse.json({
    ok: true,
    client: client.name,
    email: client.email,
    appliancesScheduled: appliancesWithCycles.length,
    notificationsDeleted: deleted,
    notificationsCreated: created,
    fireAt: fireAt.toISOString(),
    nextStep: `Now visit: ${process.env.APP_BASE_URL}/api/cron/notify?secret=${secret}`,
  });
}
