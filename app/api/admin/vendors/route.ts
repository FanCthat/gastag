import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

function requireSuperAdmin(session: any) {
  return session?.user?.role === "super_admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vendors = await prisma.vendor.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, contactName: true, contactEmail: true, region: true, isActive: true, createdAt: true },
  });
  return NextResponse.json(vendors);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, contactName, contactEmail, password, region } = await req.json();
  if (!name || !contactName || !contactEmail || !password) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const existing = await prisma.vendor.findUnique({ where: { contactEmail } });
  if (existing) return NextResponse.json({ error: "Email already in use." }, { status: 409 });

  const hash = await bcrypt.hash(password, 12);
  const vendor = await prisma.vendor.create({
    data: { name, contactName, contactEmail, password: hash, region: region || null },
  });

  return NextResponse.json({ id: vendor.id }, { status: 201 });
}
