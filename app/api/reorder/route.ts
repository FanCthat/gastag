import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

const FROM = "GasTag <noreply@mobwatch.co.za>";

export async function POST(req: NextRequest) {
  const { clientId, applianceIds, fulfilmentType = "delivery", deliveryAddress, addressIsPermanentChange } = await req.json();

  if (!clientId || !applianceIds?.length) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (fulfilmentType === "delivery" && !deliveryAddress) {
    return NextResponse.json({ error: "Delivery address is required for home delivery." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      vendor: { select: { name: true, contactEmail: true, contactEmail2: true, isActive: true } },
      appliances: {
        where: { id: { in: applianceIds }, isActive: true },
        include: {
          cylinderCycles: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  if (!client.vendor.isActive) {
    return NextResponse.json({ error: "This supplier is no longer accepting orders via GasTag." }, { status: 400 });
  }

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
        fulfilmentType,
        deliveryAddress: fulfilmentType === "delivery" ? deliveryAddress : null,
        addressIsPermanentChange: fulfilmentType === "delivery" ? !!addressIsPermanentChange : false,
        status: "pending",
        orderItems: { create: orderItems },
      },
    });

    await tx.cylinderCycle.updateMany({
      where: { id: { in: orderItems.map(i => i.cylinderCycleId) } },
      data: { status: "ordered" },
    });

    if (fulfilmentType === "delivery" && addressIsPermanentChange) {
      await tx.client.update({ where: { id: clientId }, data: { deliveryAddress } });
    }

    return order;
  });

  const applianceLines = client.appliances
    .map(a => `• ${a.cylinderSizeKg}kg — ${a.applianceType}`)
    .join("<br/>");

  const dashboardUrl = `${process.env.APP_BASE_URL}/vendor/dashboard`;
  const isCollection = fulfilmentType === "collection";

  const fulfilmentLine = isCollection
    ? `<p><strong>Fulfilment:</strong> In-store collection / refill (client will bring cylinder(s) in)</p>`
    : `<p><strong>Deliver to:</strong><br/>${deliveryAddress}</p>`;

  let emailError: string | null = null;
  try {
    await sendEmail({
      to: client.vendor.contactEmail,
      subject: isCollection
        ? `New in-store collection request from ${client.name}`
        : `New gas order from ${client.name}`,
      html: `
        <p>Hi ${client.vendor.name},</p>
        <p><strong>${client.name}</strong> has placed a gas ${isCollection ? "collection request" : "order"}.</p>
        <p><strong>Cylinders:</strong><br/>${applianceLines}</p>
        ${fulfilmentLine}
        <p><a href="${dashboardUrl}" style="background:#f97316;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin-top:8px">View order in portal →</a></p>
      `,
      from: FROM,
      cc: client.vendor.contactEmail2 ?? undefined,
    });
  } catch (e: any) {
    emailError = e?.message ?? "unknown error";
    console.error("Vendor order email exception:", e);
  }

  return NextResponse.json({ ok: true, emailSent: !emailError, emailError, vendorEmail: client.vendor.contactEmail }, { status: 201 });
}
