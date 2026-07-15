import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const vendorId = (session?.user as any)?.id;
  if (!vendorId || (session?.user as any)?.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subject, heading, message, imageUrl, clientIds } = await req.json();
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "Subject and message are required." }, { status: 400 });
  }
  if (!Array.isArray(clientIds) || clientIds.length === 0) {
    return NextResponse.json({ error: "No recipients selected." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { name: true, logoUrl: true, isActive: true },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  if (!vendor.isActive) return NextResponse.json({ error: "Vendor account is not active." }, { status: 403 });

  const clients = await prisma.client.findMany({
    where: { vendorId, id: { in: clientIds } },
    select: { id: true, email: true, name: true },
  });

  if (clients.length === 0) {
    return NextResponse.json({ error: "No registered clients to send to." }, { status: 400 });
  }

  const baseUrl = process.env.APP_BASE_URL ?? "";
  const safeHeading = (heading ?? `Special Offer Courtesy of ${vendor.name}`).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeMessage = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const logoBlock = vendor.logoUrl
    ? `<div style="text-align:center;margin:16px 0 24px;"><img src="${vendor.logoUrl}" alt="${vendor.name}" style="max-height:80px;max-width:200px;object-fit:contain;" /></div>`
    : "";

  const imageBlock = imageUrl
    ? `<div style="text-align:center;margin:24px 0;"><img src="${imageUrl}" alt="Special offer" style="max-width:100%;border-radius:10px;" /></div>`
    : "";

  let sent = 0;
  let failed = 0;

  for (const client of clients) {
    const reorderUrl = `${baseUrl}/reorder/${client.id}`;
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#1a1a1a;">
        <h1 style="text-align:center;color:#f97316;font-size:24px;margin-bottom:8px;">${safeHeading}</h1>
        ${logoBlock}
        ${imageBlock}
        <div style="font-size:15px;line-height:1.7;white-space:pre-line;">${safeMessage}</div>
        <div style="text-align:center;margin:32px 0;">
          <a href="${reorderUrl}" style="background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">Order gas now →</a>
        </div>
        <hr style="margin:32px 0;border:none;border-top:1px solid #e5e7eb;" />
        <p style="font-size:12px;color:#9ca3af;text-align:center;">You're receiving this because you're a registered GasTag client of <strong>${vendor.name}</strong>.<br/>Need help? Call or WhatsApp <a href="tel:+27824993552" style="color:#f97316;">+27 82 499 3552</a></p>
      </div>
    `;
    try {
      await sendEmail({ to: client.email, subject: subject.trim(), html });
      sent++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: clients.length });
}
