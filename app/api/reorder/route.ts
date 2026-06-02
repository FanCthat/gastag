import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { clientId, applianceIds, deliveryAddress, addressIsPermanentChange } = await req.json();

  if (!clientId || !applianceIds?.length || !deliveryAddress) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      appliances: {
        where: { id: { in: applianceIds }, isActive: true },
        include: {
          cylinderCycles: { where: { status: "active" }, orderBy: { createdAt: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

  // Collect active cycles for selected appliances
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
        orderItems: {
          create: orderItems,
        },
      },
    });

    // Mark cycles as ordered
    await tx.cylinderCycle.updateMany({
      where: { id: { in: orderItems.map(i => i.cylinderCycleId) } },
      data: { status: "ordered" },
    });

    // Update default address if requested
    if (addressIsPermanentChange) {
      await tx.client.update({ where: { id: clientId }, data: { deliveryAddress } });
    }

    return order;
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
