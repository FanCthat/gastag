import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getVendorDataKey, resolveField } from "@/lib/client-crypto";

export const dynamic = "force-dynamic";

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function html(vendor: { contactName: string }, client: { name: string; email: string; phone: string | null; createdAt: Date }, dashboardUrl: string): string {
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
    select: {
      id: true,
      name: true,
      nameEnc: true,
      email: true,
      emailEnc: true,
      phone: true,
      phoneEnc: true,
      createdAt: true,
      vendor: { select: { contactName: true, contactEmail: true, isActive: true, encryptionOn: true, wrappedDataKey: true } },
    },
  });

  const log: string[] = [];
  let alerted = 0;

  for (const client of incomplete) {
    const { vendor } = client;
    const dataKey = (vendor.encryptionOn && vendor.wrappedDataKey)
      ? getVendorDataKey(vendor.wrappedDataKey)
      : null;
    const clientName  = resolveField(client.nameEnc,  client.name,  dataKey);
    const clientEmail = resolveField(client.emailEnc, client.email, dataKey);
    const clientPhone = client.phoneEnc
      ? resolveField(client.phoneEnc, client.phone, dataKey)
      : (client.phone ?? null);

    if (!vendor.isActive) {
      log.push(`skipped ${clientName} — vendor inactive`);
      await prisma.client.update({ where: { id: client.id }, data: { incompleteAlertSentAt: new Date() } });
      continue;
    }

    const resolved = { name: clientName, email: clientEmail, phone: clientPhone, createdAt: client.createdAt };
    try {
      await sendEmail({
        to: vendor.contactEmail,
        subject: `${clientName} started registering on GasTag but didn't finish`,
        html: html(vendor, resolved, dashboardUrl),
      });
      log.push(`alerted vendor for ${clientName} → ${vendor.contactEmail}`);
      alerted++;
    } catch (err: any) {
      log.push(`FAILED for ${clientName} — ${err.message}`);
      continue;
    }

    await prisma.client.update({ where: { id: client.id }, data: { incompleteAlertSentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, alerted, log });
}
