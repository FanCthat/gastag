import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";
import JSZip from "jszip";

function requireSuperAdmin(session: any) {
  return session?.user?.role === "super_admin";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: vendorId } = await params;
  const { count = 10 } = await req.json();
  const qty = Math.min(Math.max(parseInt(count), 1), 500);

  const baseUrl = process.env.APP_BASE_URL || "https://gastag.co.za";

  // Create QR code records in DB
  const created = await prisma.$transaction(
    Array.from({ length: qty }, () =>
      prisma.qRCode.create({ data: { vendorId } })
    )
  );

  // Generate QR PNGs and ZIP
  const zip = new JSZip();
  for (const qr of created) {
    const url = `${baseUrl}/scan/${qr.id}`;
    const png = await QRCode.toBuffer(url, { width: 400, margin: 2 });
    zip.file(`${qr.id}.png`, png);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

  return new Response(zipBuffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="gastag-qr-${vendorId}-${qty}.zip"`,
    },
  });
}
