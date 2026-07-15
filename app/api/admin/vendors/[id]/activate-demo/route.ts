import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const FROM = "GasTag <noreply@mobwatch.co.za>";
const baseUrl = process.env.APP_BASE_URL || "https://gastag.vercel.app";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    select: { id: true, name: true, contactName: true, contactEmail: true, isDemo: true },
  });

  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  if (!vendor.isDemo) return NextResponse.json({ error: "Vendor is not a demo vendor." }, { status: 400 });

  await prisma.$transaction([
    prisma.client.deleteMany({ where: { vendorId: id } }),
    prisma.qRCode.deleteMany({ where: { vendorId: id } }),
    prisma.vendor.update({
      where: { id },
      data: { isDemo: false, isActive: true },
    }),
  ]);

  const vendorLoginUrl = `${baseUrl}/vendor/login`;

  try {
    await sendEmail({
      to: vendor.contactEmail,
      subject: "Welcome to GasTag — your account is now live!",
      from: FROM,
      html: `
        <div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:white;padding:28px 24px;border:1px solid #e5e7eb;border-radius:8px;">
          <h2 style="color:#111827;margin:0 0 16px;">Welcome to GasTag, ${vendor.contactName}!</h2>
          <p style="color:#374151;margin:0 0 12px;">Your GasTag supplier account is now active and ready to use.</p>
          <p style="color:#374151;margin:0 0 20px;">Your first batch of QR keyrings is on its way. Log in to your supplier dashboard to get started.</p>
          <a href="${vendorLoginUrl}" style="background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Log in to your dashboard →</a>
          <p style="color:#6b7280;font-size:12px;margin-top:24px;">If you have any questions, reply to this email and we'll help you get set up.</p>
        </div>
      `,
    });

    await sendEmail({
      to: "paul@mobwatch.co.za",
      subject: `GasTag vendor activated: ${vendor.name}`,
      from: FROM,
      html: `
        <p><strong>${vendor.name}</strong> (${vendor.contactEmail}) has been activated.</p>
        <p>Demo test data has been cleared. Their account is now live.</p>
        <p><a href="${baseUrl}/admin/vendors/${id}">View vendor in admin →</a></p>
      `,
    });
  } catch (err) {
    console.error("Failed to send activation emails", err);
  }

  return NextResponse.json({ ok: true });
}
