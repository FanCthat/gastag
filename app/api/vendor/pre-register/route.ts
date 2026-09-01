import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getVendorDataKey, encryptField, hashEmail, hashPhone } from "@/lib/client-crypto";
import { scheduleNotificationsForCycle } from "@/lib/notifications";
import { addMonths, getIndustryAverage, calcActualDurationMonths } from "@/lib/prediction";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendorId = (session.user as any).id as string;

  const {
    qrCodeId,
    name,
    phone,
    email,
    deliveryAddress,
    applianceType,
    cylinderSizeKg,
    predictionBasis,       // "measured" | "estimate" | "industry"
    lastPurchaseDate,      // ISO date string, optional
    previousPurchaseDate,  // ISO date string, required when predictionBasis="measured"
    estimateMonths,        // number, required when predictionBasis="estimate"
  } = await req.json();

  if (!qrCodeId || !name || !phone || !deliveryAddress || !applianceType || !cylinderSizeKg) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const qr = await prisma.qRCode.findUnique({ where: { id: qrCodeId } });
  if (!qr) return NextResponse.json({ error: "QR code not found." }, { status: 404 });
  if (qr.vendorId !== vendorId) return NextResponse.json({ error: "QR code does not belong to your account." }, { status: 403 });
  if (qr.state !== "unregistered") return NextResponse.json({ error: "This QR code is already in use." }, { status: 400 });

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { encryptionOn: true, wrappedDataKey: true, isTrial: true, trialStartedAt: true },
  });
  if (!vendor) return NextResponse.json({ error: "Vendor not found." }, { status: 500 });

  const dataKey = (vendor.encryptionOn && vendor.wrappedDataKey)
    ? getVendorDataKey(vendor.wrappedDataKey)
    : null;

  // Compute predicted empty date from the chosen prediction basis.
  // lastDate anchors the calculation — if the last purchase date is known, use it
  // (the cylinder was full then); otherwise anchor to today.
  const now = new Date();
  const lastDate = lastPurchaseDate ? new Date(lastPurchaseDate) : now;
  let predictedEmptyDate: Date;
  let baselineUsed: string;

  if (predictionBasis === "measured" && previousPurchaseDate) {
    const prevDate = new Date(previousPurchaseDate);
    const intervalMonths = calcActualDurationMonths(prevDate, lastDate);
    predictedEmptyDate = addMonths(lastDate, intervalMonths);
    baselineUsed = "measured_interval";
  } else if (predictionBasis === "estimate" && estimateMonths) {
    predictedEmptyDate = addMonths(lastDate, Number(estimateMonths));
    baselineUsed = "supplier_estimate";
  } else {
    const avg = await getIndustryAverage(Number(cylinderSizeKg));
    predictedEmptyDate = addMonths(lastDate, avg);
    baselineUsed = "industry_average";
  }

  const normalEmail = email?.trim().toLowerCase() || null;
  const normalPhone = phone.trim();
  const normalName = name.trim();
  const normalAddress = deliveryAddress.trim();

  const { client, appliance, cycle } = await prisma.$transaction(async tx => {
    const c = await tx.client.create({
      data: {
        qrCodeId,
        vendorId,
        name:               dataKey ? null : normalName,
        nameEnc:            dataKey ? encryptField(normalName, dataKey) : null,
        email:              (normalEmail && !dataKey) ? normalEmail : null,
        emailEnc:           (normalEmail && dataKey)  ? encryptField(normalEmail, dataKey) : null,
        emailHash:          normalEmail ? hashEmail(normalEmail) : null,
        phone:              dataKey ? null : normalPhone,
        phoneEnc:           dataKey ? encryptField(normalPhone, dataKey) : null,
        phoneHash:          hashPhone(normalPhone),
        deliveryAddress:    dataKey ? null : normalAddress,
        deliveryAddressEnc: dataKey ? encryptField(normalAddress, dataKey) : null,
        notificationPreference: normalEmail ? "email" : "push",
      },
    });

    const a = await tx.appliance.create({
      data: {
        clientId: c.id,
        applianceType,
        cylinderSizeKg:  dataKey ? null : Number(cylinderSizeKg),
        cylinderSizeEnc: dataKey ? encryptField(String(cylinderSizeKg), dataKey) : null,
      },
    });

    const cy = await tx.cylinderCycle.create({
      data: { applianceId: a.id, cycleNumber: 1, baselineUsed, predictedEmptyDate },
    });

    await tx.qRCode.update({
      where: { id: qrCodeId },
      data: { state: "pre_registered", registeredAt: new Date() },
    });

    return { client: c, appliance: a, cycle: cy };
  });

  await scheduleNotificationsForCycle(
    client.id, appliance.id, cycle.id, predictedEmptyDate,
    client.notificationPreference,
    { isTrial: vendor.isTrial, trialStartedAt: vendor.trialStartedAt },
  );

  return NextResponse.json({ clientId: client.id }, { status: 201 });
}
