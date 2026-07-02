import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

const FROM = "GasTag <noreply@mobwatch.co.za>";
const baseUrl = process.env.APP_BASE_URL || "https://gastag.vercel.app";

export async function POST(req: NextRequest) {
  const { qrCodeId, name, email, phone, deliveryAddress, notificationPreference } = await req.json();

  if (!qrCodeId || !name || !email || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const qr = await prisma.qRCode.findUnique({ where: { id: qrCodeId } });
  if (!qr || qr.state !== "unregistered") {
    return NextResponse.json({ error: "QR code not available." }, { status: 400 });
  }

  const client = await prisma.$transaction(async tx => {
    const c = await tx.client.create({
      data: {
        qrCodeId,
        vendorId: qr.vendorId,
        name,
        email,
        phone: phone || null,
        deliveryAddress,
        notificationPreference: notificationPreference || "both",
      },
    });
    await tx.qRCode.update({
      where: { id: qrCodeId },
      data: { state: "registered", registeredAt: new Date() },
    });
    return c;
  });

  const vendor = await prisma.vendor.findUnique({
    where: { id: qr.vendorId },
    select: { isDemo: true, name: true, contactEmail: true },
  });

  if (vendor?.isDemo) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      const reorderUrl = `${baseUrl}/reorder/${client.id}`;
      const nextDemoUrl = `${baseUrl}/demo/next/${client.id}`;

      await resend.emails.send({
        from: FROM,
        to: email,
        subject: `🔬 DEMO — Your first GasTag reminder, ${name}`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <div style="background:#f97316;color:white;padding:12px 20px;font-weight:bold;font-size:13px;border-radius:8px 8px 0 0;">
              🔬 DEMO MODE — In live operation, this email arrives 6 weeks before your cylinder is predicted empty.
            </div>
            <div style="background:white;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <h2 style="color:#111827;margin:0 0 12px;">Your cylinder is getting low, ${name}</h2>
              <p style="color:#374151;margin:0 0 12px;">This is your early warning — your cylinder(s) are approaching empty.</p>
              <p style="color:#374151;margin:0 0 20px;">Now is the ideal time to place your order so delivery arrives before you run out.</p>
              <a href="${reorderUrl}" style="background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin:0 0 16px;">Order gas now →</a>
              <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
                <p style="color:#6b7280;font-size:13px;margin:0 0 10px;">Tap the button below to receive your next demo reminder email:</p>
                <a href="${nextDemoUrl}" style="background:#1e40af;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Receive next demo email →</a>
              </div>
            </div>
          </div>
        `,
      });

      await prisma.notification.create({
        data: {
          clientId: client.id,
          type: "demo_6week",
          scheduledFor: new Date(),
          sentAt: new Date(),
          channel: "email",
        },
      });
    } catch (err) {
      console.error("Failed to send demo email 1", err);
    }
  }

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
