import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import QRCode from "qrcode";
import Link from "next/link";

const baseUrl = process.env.APP_BASE_URL || "https://gastag.vercel.app";

export default async function DemoSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ vendorId: string }>;
  searchParams: Promise<{ pw?: string }>;
}) {
  const { vendorId } = await params;
  const { pw } = await searchParams;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: { name: true, contactEmail: true, contactName: true },
  });
  if (!vendor) notFound();

  const qrCodes = await prisma.qRCode.findMany({
    where: { vendorId },
    select: { id: true },
    take: 3,
  });

  const qrImages = await Promise.all(
    qrCodes.map(qr =>
      QRCode.toDataURL(`${baseUrl}/scan/${qr.id}`, { width: 280, margin: 2 })
    )
  );

  const steps = [
    "Display a QR code on your screen and scan it with a phone.",
    "Register as your customer would — name, email, address, appliance type, cylinder size. Complete both screens before checking your email, otherwise \"Order gas now\" will show an empty page.",
    "Watch your inbox — you'll receive your first demo email immediately.",
    "Tap \"Next demo email\" in each email to progress through the reminder sequence.",
    "Log into your supplier dashboard to see orders and clients.",
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Heading */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your demo is ready!</h1>
          <p className="text-gray-500 mt-1">{vendor.name}</p>
        </div>

        {/* Credentials */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-3">Your supplier login credentials</h2>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20">Email:</span>
              <span className="text-gray-900">{vendor.contactEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20">Password:</span>
              <span className="text-gray-900 font-bold">{pw || "—"}</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">Save these — this is the only time the password is shown.</p>
        </div>

        {/* QR Codes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Your 3 demo QR codes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {qrImages.map((dataUrl, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <img src={dataUrl} alt={`QR Code ${i + 1}`} className="w-36 h-36 border border-gray-200 rounded-lg" />
                <span className="text-xs text-gray-500 font-medium">QR Code {i + 1}</span>
                <a
                  href={`${baseUrl}/scan/${qrCodes[i].id}`}
                  className="text-xs text-orange-500 underline"
                >
                  (or tap here)
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-4">How to test your demo</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-gray-700">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA */}
        <div className="text-center pb-4">
          <Link
            href="/vendor/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            Go to your supplier dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
