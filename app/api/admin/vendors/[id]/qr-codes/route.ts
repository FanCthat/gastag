import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";
import JSZip from "jszip";

export const runtime = "nodejs";

function requireSuperAdmin(session: any) {
  return session?.user?.role === "super_admin";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: vendorId } = await params;
    const body = await req.json();
    const qty = Math.min(Math.max(parseInt(body.count ?? 10), 1), 200);

    const baseUrl = process.env.APP_BASE_URL || "https://gastag.vercel.app";

    // Create QR code records sequentially to avoid pool exhaustion
    const created = [];
    for (let i = 0; i < qty; i++) {
      const qr = await prisma.qRCode.create({ data: { vendorId } });
      created.push(qr);
    }

    // Generate QR PNGs and ZIP
    const zip = new JSZip();
    for (const qr of created) {
      const url = `${baseUrl}/scan/${qr.id}`;
      const png = await QRCode.toBuffer(url, { width: 400, margin: 2, type: "png" });
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
  } catch (err: any) {
    console.error("QR generation error:", err);
    return NextResponse.json({ error: err.message || "QR generation failed" }, { status: 500 });
  }
}
