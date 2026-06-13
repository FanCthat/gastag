import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { predictCycle1 } from "@/lib/prediction";
import { scheduleNotificationsForCycle } from "@/lib/notifications";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY!); }
const FROM = "GasTag <noreply@mobwatch.co.za>";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

export async function POST(req: NextRequest) {
  const { clientId, applianceType, cylinderSizeKg, clientEstimatedDurationMonths, currentRemainingMonths } = await req.json();

  if (!clientId || !applianceType || !cylinderSizeKg) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: { vendor: { select: { name: true } } },
  });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const now = new Date();
  const { predictedEmptyDate, baselineUsed } = await predictCycle1(
    now,
    cylinderSizeKg,
    clientEstimatedDurationMonths ?? null,
    currentRemainingMonths ?? null
  );

  const appliance = await prisma.appliance.create({
    data: { clientId, applianceType, cylinderSizeKg, clientEstimatedDurationMonths: clientEstimatedDurationMonths ?? null },
  });

  const cycle = await prisma.cylinderCycle.create({
    data: { applianceId: appliance.id, cycleNumber: 1, baselineUsed, predictedEmptyDate },
  });

  await scheduleNotificationsForCycle(
    clientId, appliance.id, cycle.id, predictedEmptyDate, client.notificationPreference
  );

  const accountUrl = `${process.env.APP_BASE_URL}/account/${clientId}`;
  const reorderUrl = `${process.env.APP_BASE_URL}/reorder/${clientId}`;
  const applianceLabel = applianceType.replace("_", " ");

  // Check if this is the first appliance (welcome email) or additional (added email)
  const applianceCount = await prisma.appliance.count({ where: { clientId } });
  const isFirst = applianceCount === 1;

  try {
    await getResend().emails.send({
      from: FROM,
      to: client.email,
      subject: isFirst
        ? `Welcome to GasTag — you're all set, ${client.name.split(" ")[0]}!`
        : `GasTag — ${applianceLabel} added to your account`,
      html: isFirst ? `
        <p>Hi ${client.name.split(" ")[0]},</p>
        <p>Welcome to GasTag! Your <strong>${cylinderSizeKg}kg ${applianceLabel}</strong> cylinder has been registered with <strong>${client.vendor.name}</strong>.</p>
        <p>Based on your usage, we predict your cylinder will need replacing around <strong>${formatDate(predictedEmptyDate)}</strong>. We'll send you reminders well in advance so you're never caught without gas.</p>
        <p>When you're ready to order, just scan your QR sticker or tap the button below:</p>
        <p><a href="${reorderUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Order gas →</a></p>
        <p>You can view your account anytime here: <a href="${accountUrl}">${accountUrl}</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Need help? Call or WhatsApp <a href="tel:+27824993552">+27 82 499 3552</a></p>
      ` : `
        <p>Hi ${client.name.split(" ")[0]},</p>
        <p>Your <strong>${cylinderSizeKg}kg ${applianceLabel}</strong> has been added to your GasTag account.</p>
        <p>Predicted empty date: <strong>${formatDate(predictedEmptyDate)}</strong>. We'll remind you well in advance.</p>
        <p><a href="${accountUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View my account →</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Need help? Call or WhatsApp <a href="tel:+27824993552">+27 82 499 3552</a></p>
      `,
    });
  } catch (e) {
    console.error("Welcome email failed:", e);
  }

  return NextResponse.json({ applianceId: appliance.id, cycleId: cycle.id }, { status: 201 });
}
