import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import bcrypt from "bcryptjs";

function requireSuperAdmin(session: any) {
  return session?.user?.role === "super_admin";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      _count: { select: { clients: true, qrCodes: true, orders: true } },
    },
  });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vendor);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data: any = {};

  if (body.name !== undefined) data.name = body.name;
  if (body.contactName !== undefined) data.contactName = body.contactName;
  if (body.logoUrl !== undefined) data.logoUrl = body.logoUrl || null;
  if (body.whatsapp !== undefined) data.whatsapp = body.whatsapp || null;
  if (body.contactEmail2 !== undefined) data.contactEmail2 = body.contactEmail2 || null;
  if (body.region !== undefined) data.region = body.region || null;
  // Fix 2: only allow deactivation via PATCH. Activation must go through /activate-demo
  // (which clears demo data and sends welcome email) — never via direct flag toggle.
  if (body.isActive === false) data.isActive = false;
  if (body.password) data.password = await bcrypt.hash(body.password, 12);

  // Fix 3: detect contactEmail change before writing, then notify Paul
  let oldEmail: string | null = null;
  if (body.contactEmail !== undefined) {
    const current = await prisma.vendor.findUnique({ where: { id }, select: { contactEmail: true, name: true } });
    oldEmail = current?.contactEmail ?? null;
    data.contactEmail = body.contactEmail;
  }

  const vendor = await prisma.vendor.update({ where: { id }, data });

  if (oldEmail && body.contactEmail && body.contactEmail !== oldEmail) {
    console.log(`[AUDIT] Vendor ${id} (${vendor.name}) login email changed: ${oldEmail} → ${body.contactEmail}`);
    try {
      await sendEmail({
        to: "paul@mobwatch.co.za",
        subject: `GasTag admin: vendor login email changed — ${vendor.name}`,
        html: `
          <p>A vendor's login email was changed in the admin.</p>
          <table style="border-collapse:collapse;font-size:14px;">
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Vendor</td><td>${vendor.name}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Old email</td><td>${oldEmail}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">New email</td><td>${body.contactEmail}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#6b7280;font-weight:600;">Changed at</td><td>${new Date().toISOString()}</td></tr>
          </table>
          <p><a href="${process.env.APP_BASE_URL}/admin/vendors/${id}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">View vendor in admin →</a></p>
        `,
      });
    } catch (e) {
      console.error("Failed to send email change notification:", e);
    }
  }

  return NextResponse.json({ id: vendor.id });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Fix 5: never delete an active vendor — require deactivation first
  const vendor = await prisma.vendor.findUnique({ where: { id }, select: { isActive: true } });
  if (!vendor) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (vendor.isActive) {
    return NextResponse.json(
      { error: "Cannot delete an active vendor. Deactivate the account first." },
      { status: 403 }
    );
  }

  await prisma.$transaction([
    prisma.escalationFlag.deleteMany({ where: { vendorId: id } }),
    prisma.order.deleteMany({ where: { vendorId: id } }),
    prisma.client.deleteMany({ where: { vendorId: id } }),
    prisma.vendor.delete({ where: { id } }),
  ]);

  return NextResponse.json({ ok: true });
}
