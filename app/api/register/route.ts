import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getVendorDataKey, encryptField, hashEmail } from "@/lib/client-crypto";

export async function POST(req: NextRequest) {
  const { qrCodeId, name, email, phone, deliveryAddress, notificationPreference } = await req.json();

  if (!qrCodeId || !name || !email || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const qr = await prisma.qRCode.findUnique({ where: { id: qrCodeId } });
  if (!qr || qr.state !== "unregistered") {
    return NextResponse.json({ error: "QR code not available." }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id: qr.vendorId },
    select: { name: true, contactEmail: true, encryptionOn: true, wrappedDataKey: true },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 400 });

  const dataKey = (vendor.encryptionOn && vendor.wrappedDataKey)
    ? getVendorDataKey(vendor.wrappedDataKey)
    : null;

  const normalEmail = email.trim().toLowerCase();

  const client = await prisma.$transaction(async tx => {
    const c = await tx.client.create({
      data: {
        qrCodeId,
        vendorId: qr.vendorId,
        name:              dataKey ? null : name,
        nameEnc:           dataKey ? encryptField(name, dataKey) : null,
        email:             dataKey ? null : normalEmail,
        emailEnc:          dataKey ? encryptField(normalEmail, dataKey) : null,
        emailHash:         hashEmail(email),
        phone:             (phone && !dataKey) ? phone : null,
        phoneEnc:          (phone && dataKey)  ? encryptField(phone, dataKey) : null,
        deliveryAddress:    dataKey ? null : deliveryAddress,
        deliveryAddressEnc: dataKey ? encryptField(deliveryAddress, dataKey) : null,
        notificationPreference: notificationPreference || "both",
      },
    });
    await tx.qRCode.update({
      where: { id: qrCodeId },
      data: { state: "registered", registeredAt: new Date() },
    });
    return c;
  });

  // Notify vendor + Paul. Uses plaintext values from the request (pre-encryption).
  // Fire-and-forget — don't block the client's response.
  Promise.resolve().then(async () => {
    if (!vendor) return;
    const dashboardUrl = `${process.env.APP_BASE_URL}/vendor/dashboard`;
    return sendEmail({
      to: vendor.contactEmail,
      subject: `New registration — ${name}`,
      html: `
        <p>Hi ${vendor.name},</p>
        <p>A new client has just registered a GasTag keyring.</p>
        <p>
          <strong>Name:</strong> ${name}<br/>
          <strong>Email:</strong> ${email}<br/>
          ${phone ? `<strong>Phone:</strong> ${phone}<br/>` : ""}
          <strong>Delivery address:</strong> ${deliveryAddress}
        </p>
        <p style="color:#888;font-size:13px;">Cylinder details will follow once they complete the next step.</p>
        <p><a href="${dashboardUrl}" style="background:#1a6644;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:8px">View in portal →</a></p>
      `,
      cc: process.env.ESCALATION_EMAIL ?? undefined,
    });
  }).catch(err => console.error("[register] notification email failed:", err));

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
