import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

export const runtime = "nodejs";

function requireSuperAdmin(session: any) {
  return session?.user?.role === "super_admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, contactName: true, contactEmail: true,
      region: true, isActive: true, isTrial: true, trialStartedAt: true,
      trialEndsAt: true, createdAt: true,
    },
  });
  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, contactName, contactEmail, password, region, whatsapp } = await req.json();
  if (!name || !contactName || !contactEmail || !password) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const existing = await prisma.vendor.findUnique({ where: { contactEmail } });
  if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const vendor = await prisma.vendor.create({
    data: {
      name,
      contactName,
      contactEmail,
      password: hash,
      region: region || null,
      whatsapp: whatsapp || null,
      isTrial: true,
      trialStartedAt: now,
      trialEndsAt,
    },
  });

  // Generate 3 trial QR codes and PNG attachments
  const baseUrl = process.env.APP_BASE_URL ?? "https://gastag.vercel.app";
  const portalUrl = `${baseUrl}/vendor`;
  const attachments: Array<{ filename: string; content: Buffer }> = [];
  const qrUrls: string[] = [];

  for (let i = 0; i < 3; i++) {
    const qr = await prisma.qRCode.create({ data: { vendorId: vendor.id, isTrialCode: true } });
    const url = `${baseUrl}/scan/${qr.id}`;
    qrUrls.push(url);
    const png = await QRCode.toBuffer(url, { width: 400, margin: 2, type: "png" }) as Buffer;
    attachments.push({ filename: `gastag-demo-qr-${i + 1}.png`, content: png });
  }

  // Send vendor welcome email with QR code PNGs attached
  try {
    await sendEmail({
      to: contactEmail,
      subject: "Welcome to GasTag — your 3 demo QR codes are attached",
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a16;">
          <div style="background:#0f3d28;padding:18px 24px;text-align:center;">
            <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.3px;">⬡ GasTag</span>
          </div>
          <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
            <p style="font-size:15px;font-weight:500;margin:0 0 16px;">Hi ${contactName},</p>
            <p style="color:#374151;line-height:1.65;margin:0 0 14px;">
              Welcome to GasTag. Your trial account is ready — 3 demo QR codes are attached to this email as PNGs.
            </p>

            <div style="background:#f5f3ee;border-radius:10px;padding:16px 20px;margin:20px 0;">
              <p style="font-size:13px;font-weight:700;color:#1a1a16;margin:0 0 4px;">Your portal login</p>
              <p style="font-size:13px;color:#374151;margin:0;">URL: <a href="${portalUrl}" style="color:#d4650a;">${portalUrl}</a></p>
              <p style="font-size:13px;color:#374151;margin:4px 0 0;">Email: <strong>${contactEmail}</strong></p>
              <p style="font-size:13px;color:#374151;margin:4px 0 0;">Password: <strong>${password}</strong></p>
            </div>

            <p style="color:#374151;font-weight:600;margin:20px 0 8px;">What to do next:</p>
            <ol style="color:#374151;line-height:1.9;padding-left:20px;margin:0 0 16px;">
              <li>Open each of the 3 attached QR code images on your phone (or print them)</li>
              <li>Scan each QR code — it will open the GasTag registration page</li>
              <li>Register as a demo client using a <strong>different name, email address, and appliance</strong> for each one (e.g. stove, geyser, braai)</li>
              <li>Your first reminder email will arrive tomorrow</li>
              <li>Over the next 6 days you'll receive the full sequence your real customers will experience</li>
            </ol>

            <p style="color:#374151;line-height:1.65;margin:0 0 20px;">
              After day 7, Paul will be in touch to discuss your keyring order and getting your first real clients on board.
            </p>

            <p style="font-size:12px;color:#9ca3af;">
              Questions? Call or WhatsApp Paul on
              <a href="tel:+27824993552" style="color:#d4650a;">+27 82 499 3552</a>
            </p>
          </div>
        </div>
      `,
      attachments,
    });
  } catch (err: any) {
    // Welcome email failure is logged but does not roll back vendor creation.
    console.error("[vendor create] Welcome email failed:", err);
  }

  return NextResponse.json({ id: vendor.id }, { status: 201 });
}
