import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function html(vendor: { contactName: string }, client: { name: string; email: string; phone: string | null; createdAt: Date }, dashboardUrl: string) {
  const registeredAt = new Date(client.createdAt).toLocaleString("en-ZA", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
  return `
    <p>Hi ${vendor.contactName},</p>
    <p>Someone scanned one of your GasTag keyrings and started registering, but didn't finish — they entered their contact details and then stopped before adding their cylinder information.</p>
    <p><strong>Name:</strong> ${client.name}<br>
    <strong>Email:</strong> ${client.email}<br>
    ${client.phone ? `<strong>Phone:</strong> ${client.phone}<br>` : ""}
    <strong>Started:</strong> ${registeredAt}</p>
    <p>Without cylinder details, no reminder schedule has been set up for them. It may be worth a quick call or message to help them finish — once they complete registration, their reminders will start automatically.</p>
    <p><a href="${dashboardUrl}">View your GasTag dashboard</a></p>
    <p>— The GasTag team</p>
  `.trim();
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - TWO_HOURS_MS);
  const dashboardUrl = `${process.env.APP_BASE_URL}/vendor/dashboard?tab=clients`;

  const incomplete = await prisma.client.findMany({
    where: {
      createdAt: { lte: cutoff },
      incompleteAlertSentAt: null,
      appliances: { none: {} },
    },
    include: {
      vendor: { select: { contactName: true, contactEmail: true, isActive: true } },
    },
  });

  const log: string[] = [];
  let alerted = 0;

  for (const client of incomplete) {
    const { vendor } = client;

    if (!vendor.isActive) {
      log.push(`skipped ${client.name} — vendor inactive`);
      await prisma.client.update({ where: { id: client.id }, data: { incompleteAlertSentAt: new Date() } });
      continue;
    }

    try {
      await sendEmail({
        to: vendor.contactEmail,
        subject: `${client.name} started registering on GasTag but didn't finish`,
        html: html(vendor, client, dashboardUrl),
      });
      log.push(`alerted vendor for ${client.name} → ${vendor.contactEmail}`);
      alerted++;
    } catch (err: any) {
      log.push(`FAILED for ${client.name} — ${err.message}`);
      continue;
    }

    await prisma.client.update({ where: { id: client.id }, data: { incompleteAlertSentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, alerted, log });
}
