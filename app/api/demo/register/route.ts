import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { Resend } from "resend";

const FROM = "GasTag <noreply@mobwatch.co.za>";
const baseUrl = process.env.APP_BASE_URL || "https://gastag.vercel.app";

function generateDemoPassword(): string {
  // Exclude visually ambiguous characters: 0/O, 1/I/L
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `Demo-${result}`;
}

export async function POST(req: NextRequest) {
  const { businessName, contactName, email, phone } = await req.json();

  if (!businessName?.trim() || !contactName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Business name, your name, and email are required." }, { status: 400 });
  }

  let plainPassword = generateDemoPassword();
  const hashedPassword = await bcrypt.hash(plainPassword, 12);

  let vendor: { id: string; name: string };
  try {
    vendor = await prisma.vendor.create({
      data: {
        name: businessName.trim(),
        contactName: contactName.trim(),
        contactEmail: email.trim().toLowerCase(),
        password: hashedPassword,
        region: "Demo",
        isDemo: true,
        isActive: false,
        qrCodes: {
          create: [
            { state: "unregistered" },
            { state: "unregistered" },
            { state: "unregistered" },
          ],
        },
      },
    });
  } catch (err: any) {
    console.error("Demo vendor create error:", err);
    if (err?.code === "P2002") {
      // Email already exists — if it's a demo vendor, reset their password and reuse the account
      const existing = await prisma.vendor.findUnique({
        where: { contactEmail: email.trim().toLowerCase() },
        select: { id: true, isDemo: true },
      });
      if (!existing || !existing.isDemo) {
        return NextResponse.json({ error: "An active supplier account already exists with that email address. Please use a different email." }, { status: 409 });
      }
      const newPassword = generateDemoPassword();
      // Wipe old test data and QR codes so they get a clean slate
      await prisma.escalationFlag.deleteMany({ where: { vendorId: existing.id } });
      await prisma.order.deleteMany({ where: { vendorId: existing.id } });
      await prisma.client.deleteMany({ where: { vendorId: existing.id } });
      await prisma.qRCode.deleteMany({ where: { vendorId: existing.id } });
      await prisma.vendor.update({
        where: { id: existing.id },
        data: {
          name: businessName.trim(),
          contactName: contactName.trim(),
          password: await bcrypt.hash(newPassword, 12),
          isDemo: true,
          isActive: false,
          qrCodes: { create: [{ state: "unregistered" }, { state: "unregistered" }, { state: "unregistered" }] },
        },
      });
      vendor = { id: existing.id, name: businessName.trim() };
      plainPassword = newPassword;
    } else {
      return NextResponse.json({ error: `Database error: ${err?.message ?? err}` }, { status: 500 });
    }
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: FROM,
      to: "paul@mobwatch.co.za",
      subject: `New demo signup: ${businessName.trim()}`,
      html: `
        <h2>New GasTag demo signup</h2>
        <table style="border-collapse:collapse;font-size:14px;">
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Business</td><td style="padding:4px 0;">${businessName.trim()}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Contact</td><td style="padding:4px 0;">${contactName.trim()}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Email</td><td style="padding:4px 0;">${email.trim()}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Phone</td><td style="padding:4px 0;">${phone?.trim() || "—"}</td></tr>
        </table>
        <p style="margin-top:16px;">
          <a href="${baseUrl}/admin/vendors/${vendor.id}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">
            View in admin →
          </a>
        </p>
      `,
    });
  } catch (err) {
    console.error("Failed to send demo signup notification email", err);
  }

  return NextResponse.json({ vendorId: vendor.id, password: plainPassword }, { status: 201 });
}
