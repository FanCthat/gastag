import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// Suppression: strips all PII from the client record but retains emailHash and phoneHash
// as do-not-re-add identifiers, then sets suppressedAt. Cancels all pending notifications.
// The vendor dashboard banner clears when suppressedAt is set.
export async function POST(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "vendor") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const vendorId = (session.user as any).id as string;

  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, vendorId: true, suppressedAt: true },
  });

  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  if (client.vendorId !== vendorId) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  if (client.suppressedAt) return NextResponse.json({ ok: true }); // idempotent

  try {
    await prisma.$transaction(async tx => {
      // Strip all PII — retain only emailHash and phoneHash for future import matching.
      await tx.client.update({
        where: { id: clientId },
        data: {
          name: null, nameEnc: null,
          email: null, emailEnc: null,
          phone: null, phoneEnc: null,
          deliveryAddress: null, deliveryAddressEnc: null,
          deviceToken: null,
          confirmedAt: null,
          notificationPreference: "email",
          suppressedAt: new Date(),
          removalRequestedAt: null,
        },
      });

      // Cancel all unsent notifications so no further reminders fire.
      await tx.notification.deleteMany({
        where: { clientId, sentAt: null },
      });
    });
  } catch (err: any) {
    console.error("suppress-client transaction failed:", err);
    return NextResponse.json(
      { error: "Suppression failed.", detail: err?.message ?? String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
