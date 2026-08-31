import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getVendorDataKey, resolveField } from "@/lib/client-crypto";
import ConfirmShell from "./_confirm-shell";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ return?: string }>;
}) {
  const { clientId } = await params;
  const { return: returnParam } = await searchParams;
  // Only allow internal paths — reject anything that could be an open redirect.
  const returnUrl = (returnParam && returnParam.startsWith("/") && !returnParam.startsWith("//"))
    ? returnParam
    : null;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true, nameEnc: true,
      email: true, emailEnc: true,
      phone: true, phoneEnc: true,
      deliveryAddress: true, deliveryAddressEnc: true,
      deviceToken: true,
      suppressedAt: true,
      notificationPreference: true,
      vendor: { select: { name: true, encryptionOn: true, wrappedDataKey: true } },
    },
  });

  if (!client || client.suppressedAt) notFound();

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(`gastag_device_${clientId}`)?.value ?? null;
  const trusted = !!(client.deviceToken && cookieToken === client.deviceToken);

  const dataKey = (client.vendor.encryptionOn && client.vendor.wrappedDataKey)
    ? getVendorDataKey(client.vendor.wrappedDataKey)
    : null;

  // Pass resolved data only to trusted devices — unknown devices get the neutral landing.
  const initialData = trusted ? {
    name: resolveField(client.nameEnc, client.name, dataKey),
    phone: resolveField(client.phoneEnc, client.phone, dataKey),
    email: resolveField(client.emailEnc, client.email, dataKey) || null,
    deliveryAddress: resolveField(client.deliveryAddressEnc, client.deliveryAddress, dataKey),
    vendorName: client.vendor.name,
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <ConfirmShell
        clientId={clientId}
        trusted={trusted}
        initialData={initialData}
        returnUrl={returnUrl}
        isMuted={client.notificationPreference === "none"}
      />
    </div>
  );
}
