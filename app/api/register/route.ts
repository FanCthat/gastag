import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { qrCodeId, name, email, deliveryAddress, notificationPreference } = await req.json();

  if (!qrCodeId || !name || !email || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const qr = await prisma.qRCode.findUnique({ where: { id: qrCodeId } });
  if (!qr || qr.state === "registered") {
    return NextResponse.json({ error: "QR code not available." }, { status: 400 });
  }

  const client = await prisma.$transaction(async tx => {
    const c = await tx.client.create({
      data: {
        qrCodeId,
        vendorId: qr.vendorId,
        name,
        email,
        deliveryAddress,
        notificationPreference: notificationPreference || "email",
      },
    });
    await tx.qRCode.update({
      where: { id: qrCodeId },
      data: { state: "registered", registeredAt: new Date() },
    });
    return c;
  });

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
