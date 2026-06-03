import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "super_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { clientId } = await params;
  const { newQrCodeId } = await req.json();

  if (!newQrCodeId) return NextResponse.json({ error: "newQrCodeId required" }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const newQr = await prisma.qRCode.findUnique({ where: { id: newQrCodeId } });
  if (!newQr) return NextResponse.json({ error: "New QR code not found" }, { status: 404 });
  if (newQr.state !== "unregistered") return NextResponse.json({ error: "QR code is already in use" }, { status: 409 });
  if (newQr.vendorId !== client.vendorId) return NextResponse.json({ error: "QR code belongs to a different vendor" }, { status: 409 });

  await prisma.$transaction([
    // Mark old QR as replaced
    prisma.qRCode.update({ where: { id: client.qrCodeId }, data: { state: "replaced" } }),
    // Mark new QR as registered and link to client
    prisma.qRCode.update({ where: { id: newQrCodeId }, data: { state: "registered", registeredAt: new Date() } }),
    // Update client to point to new QR
    prisma.client.update({ where: { id: clientId }, data: { qrCodeId: newQrCodeId } }),
  ]);

  return NextResponse.json({ ok: true });
}
