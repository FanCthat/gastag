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

  // Low gas = remaining months provided and cylinder runs out within 6 weeks
  const daysRemaining = Math.ceil((predictedEmptyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isLowGas = currentRemainingMonths !== null && currentRemainingMonths !== undefined && daysRemaining <= 42;

  const firstName = client.name.split(" ")[0];

  const lowGasWarning = isLowGas ? `
    <div style="background:#fff7ed;border:1px solid #fb923c;border-radius:8px;padding:12px 16px;margin:16px 0">
      <strong style="color:#c2410c">⚠ Your cylinder is running low</strong><br>
      <span style="color:#9a3412;font-size:14px">Based on what you told us, you have roughly ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} of gas left. We recommend ordering a refill soon.</span>
    </div>
  ` : "";

  const reminderNote = isLowGas
    ? `<p>Once your cylinder is refilled, we'll track the new one and send you reminders before it runs out.</p>`
    : `<p>We'll send you reminders before your cylinder runs out so you're never caught without gas.</p>`;

  let emailError: string | null = null;
  try {
    const result = await getResend().emails.send({
      from: FROM,
      to: client.email,
      subject: isFirst
        ? (isLowGas
            ? `GasTag — your cylinder is running low, ${firstName}!`
            : `Welcome to GasTag — you're all set, ${firstName}!`)
        : (isLowGas
            ? `GasTag — ${applianceLabel} added (low gas alert)`
            : `GasTag — ${applianceLabel} added to your account`),
      html: isFirst ? `
        <p>Hi ${firstName},</p>
        <p>Welcome to GasTag! Your <strong>${cylinderSizeKg}kg ${applianceLabel}</strong> cylinder has been registered with <strong>${client.vendor.name}</strong>.</p>
        ${lowGasWarning}
        <p>Predicted empty date: <strong>${formatDate(predictedEmptyDate)}</strong>.</p>
        ${reminderNote}
        <p><a href="${reorderUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Order gas now →</a></p>
        <p>You can view your account anytime here: <a href="${accountUrl}">${accountUrl}</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Need help? Call or WhatsApp <a href="tel:+27824993552">+27 82 499 3552</a></p>
      ` : `
        <p>Hi ${firstName},</p>
        <p>Your <strong>${cylinderSizeKg}kg ${applianceLabel}</strong> has been added to your GasTag account.</p>
        ${lowGasWarning}
        <p>Predicted empty date: <strong>${formatDate(predictedEmptyDate)}</strong>.</p>
        ${reminderNote}
        <p><a href="${isLowGas ? reorderUrl : accountUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${isLowGas ? "Order gas now →" : "View my account →"}</a></p>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">Need help? Call or WhatsApp <a href="tel:+27824993552">+27 82 499 3552</a></p>
      `,
    });
    if (result.error) {
      emailError = result.error.message;
      console.error("Welcome email failed:", result.error);
    }
  } catch (e: any) {
    emailError = e?.message ?? "unknown error";
    console.error("Welcome email exception:", e);
  }

  return NextResponse.json({ applianceId: appliance.id, cycleId: cycle.id, emailSent: !emailError, emailError }, { status: 201 });
}
