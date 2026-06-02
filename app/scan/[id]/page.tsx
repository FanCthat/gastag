import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const qr = await prisma.qRCode.findUnique({ where: { id }, include: { client: true } });

  if (!qr) notFound();

  if (qr.state === "registered" && qr.client) {
    redirect(`/account/${qr.client.id}`);
  }

  redirect(`/register/${id}`);
}
