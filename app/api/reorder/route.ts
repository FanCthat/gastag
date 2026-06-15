import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

function getResend() { return new Resend(process.env.RESEND_API_KEY!); }
const FROM = "GasTag <noreply@mobwatch.co.za>";

export async function POST(req: NextRequest) {
  const { clientId, applianceIds, deliveryAddress, addressIsPermanentChange } = await req.json();

  if (!clientId || !applianceIds?.length || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vendor: { select: { name: true, contactEmail: true } },
      appliances: {
        where: { id: { in: applianceIds }, isActive: true },
        include: {
          cylinderCycles: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  const orderItems = client.appliances
    .filter(a => a.cylinderCycles.length > 0)
    .map(a => ({
      applianceId: a.id,
      cylinderCycleId: a.cylinderCycles[0].id,
    }));

  if (orderItems.length === 0) {
    return NextResponse.json({ error: "No active cycles found for selected appliances." }, { status: 400 });
  }

  await prisma.$transaction(async tx => {
    const order = await tx.order.create({
      data: {
        clientId,
        vendorId: client.vendorId,
        deliveryAddress,
        addressIsPermanentChange: !!addressIsPermanentChange,
        status: "pending",
        orderItems: { create: orderItems },
      },
    });

    await tx.cylinderCycle.updateMany({
      where: { id: { in: orderItems.map(i => i.cylinderCycleId) } },
      data: { status: "ordered" },
    });

    if (addressIsPermanentChange) {
      await tx.client.update({ where: { id: clientId }, data: { deliveryAddress } });
    }

    return order;
  });

  // Email the vendor about the new order
  const applianceLines = client.appliances
    .map(a => `• ${a.cylinderSizeKg}kg — ${a.applianceType}`)
    .join("<br/>");

  const dashboardUrl = `${process.env.APP_BASE_URL}/vendor/dashboard`;
  const adminEmail = process.env.ADMIN_EMAIL || "paul@mobwatch.co.za";

  let emailError: string | null = null;
  try {
    const result = await getResend().emails.send({
      from: FROM,
      to: client.vendor.contactEmail,
      cc: adminEmail,
      subject: `New gas order from ${client.name}`,
      html: `
        <p>Hi ${client.vendor.name},</p>
        <p><strong>${client.name}</strong> has placed a gas order.</p>
        <p><strong>Cylinders:</strong><br/>${applianceLines}</p>
        <p><strong>Deliver to:</strong><br/>${deliveryAddress}</p>
        <p><a href="${dashboardUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:8px">View order in portal →</a></p>
      `,
    });
    if (result.error) {
      emailError = result.error.message;
      console.error("Vendor order email failed:", result.error);
    }
  } catch (e: any) {
    emailError = e?.message ?? "unknown error";
    console.error("Vendor order email exception:", e);
  }

  return NextResponse.json({ ok: true, emailSent: !emailError, emailError, vendorEmail: client.vendor.contactEmail }, { status: 201 });
}
