import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPin, signAdminCookie } from "@/lib/admin-pins";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ qrCodeId: string }> }) {
  const { qrCodeId } = await params;
  const { pin } = await req.json();

  if (!pin || typeof pin !== "string") {
    return NextResponse.json({ error: "PIN required." }, { status: 400 });
  }

  const qr = await prisma.qRCode.findUnique({
    where: { id: qrCodeId },
    select: { id: true, state: true, adminPinAttempts: true, adminPinLockedUntil: true },
  });
  if (!qr) return NextResponse.json({ error: "Not found." }, { status: 404 });

  if (qr.adminPinLockedUntil && qr.adminPinLockedUntil > new Date()) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }

  const result = verifyPin(pin);

  if (!result.valid) {
    const currentAttempts = (qr.adminPinLockedUntil && qr.adminPinLockedUntil < new Date())
      ? 0
      : qr.adminPinAttempts;
    const newAttempts = currentAttempts + 1;
    const updateData: { adminPinAttempts: number; adminPinLockedUntil?: Date | null } =
      { adminPinAttempts: newAttempts };
    if (newAttempts >= 5) {
      updateData.adminPinLockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      updateData.adminPinAttempts = 0;
    }
    await prisma.qRCode.update({ where: { id: qrCodeId }, data: updateData });
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  await prisma.qRCode.update({
    where: { id: qrCodeId },
    data: { adminPinAttempts: 0, adminPinLockedUntil: null },
  });

  const cookieValue = signAdminCookie(qrCodeId, result.name);
  const response = NextResponse.json({ ok: true });
  response.cookies.set(`gastag_admin_${qrCodeId}`, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60,
    path: "/",
    sameSite: "lax",
  });
  return response;
}
