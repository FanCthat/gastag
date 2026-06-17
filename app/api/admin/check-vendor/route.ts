import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = req.nextUrl.searchParams.get("email");
  const password = req.nextUrl.searchParams.get("password");

  if (!email) return NextResponse.json({ error: "email param required" }, { status: 400 });

  const vendor = await prisma.vendor.findFirst({
    where: { contactEmail: { equals: email.trim(), mode: "insensitive" } },
    select: { id: true, name: true, contactEmail: true, isActive: true, password: true },
  });

  if (!vendor) return NextResponse.json({ found: false, email });

  const passwordMatch = password ? await bcrypt.compare(password, vendor.password) : null;

  return NextResponse.json({
    found: true,
    name: vendor.name,
    storedEmail: vendor.contactEmail,
    isActive: vendor.isActive,
    passwordMatch,
    hasPassword: !!vendor.password,
  });
}
