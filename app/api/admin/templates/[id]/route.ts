import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";

function requireSuperAdmin(session: any) {
  return session?.user?.role === "super_admin";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!requireSuperAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { subject, bodyHtml, bodyText } = await req.json();

  await prisma.notificationTemplate.update({
    where: { id },
    data: { subject, bodyHtml, bodyText },
  });

  return NextResponse.json({ ok: true });
}
