import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
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
  if (body.contactEmail !== undefined) data.contactEmail = body.contactEmail;
  if (body.contactEmail2 !== undefined) data.contactEmail2 = body.contactEmail2 || null;
  if (body.region !== undefined) data.region = body.region || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.password) data.password = await bcrypt.hash(body.password, 12);

  const vendor = await prisma.vendor.update({ where: { id }, data });
  return NextResponse.json({ id: vendor.id });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.vendor.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
