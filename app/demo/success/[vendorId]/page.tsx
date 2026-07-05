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

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Heading */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-500 rounded-xl mb-4">
            <span className="text-white text-xl font-bold">G</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Your demo is ready, {vendor.contactName.split(" ")[0]}!</h1>
          <p className="text-gray-500 mt-1 text-sm">Follow the steps below — the whole experience takes about 5 minutes.</p>
        </div>

        {/* Credentials — save these */}
        <div className="bg-white rounded-2xl border-2 border-orange-300 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-orange-500 text-lg">🔑</span>
            <h2 className="font-bold text-gray-900">Your supplier login — save these now</h2>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 space-y-2 font-mono text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-24">Email:</span>
              <span className="text-gray-900">{vendor.contactEmail}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-24">Password:</span>
              <span className="text-gray-900 font-bold">{pw || "—"}</span>
            </div>
          </div>
          <p className="text-xs text-red-600 font-medium mt-3">
            ⚠️ This password is only shown once — screenshot it or write it down before you scroll down.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            You'll use these later to log into your supplier dashboard (Step 5 below).
          </p>
        </div>

        {/* Step-by-step walkthrough */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-bold text-gray-900 mb-1">How to run through your demo</h2>
          <p className="text-sm text-gray-500 mb-5">Do these steps in order — each one only takes a minute or two.</p>

          <ol className="space-y-6">

            {/* Step 1 */}
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center mt-0.5">1</span>
              <div>
                <p className="font-semibold text-gray-800">Pick one of your 3 QR codes below and scan it with your phone</p>
                <p className="text-sm text-gray-500 mt-1">
                  Open your phone's camera app, point it at the QR code, and tap the link that appears on your screen.
                  You don't need to download anything. If scanning doesn't work on your phone, tap the blue link underneath the code instead.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  (Each code represents one of the keyring tags your real customers will receive when they buy gas from you.)
                </p>
              </div>
            </li>

            {/* Step 2 */}
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center mt-0.5">2</span>
              <div>
                <p className="font-semibold text-gray-800">Fill in the registration form — pretend you're your customer</p>
                <p className="text-sm text-gray-500 mt-1">
                  The form has <strong>two screens</strong>. The first asks for name, email, and delivery address.
                  The second asks about the gas cylinder. <strong>Complete both screens</strong> before you go to check your email —
                  the "Order gas now" button in the emails only works once registration is fully finished.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2 text-xs text-amber-800">
                  💡 Use a real email address you can access — that's where your demo reminder emails will arrive.
                </div>
              </div>
            </li>

            {/* Step 3 */}
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center mt-0.5">3</span>
              <div>
                <p className="font-semibold text-gray-800">Check your inbox — your first reminder email arrives within a minute</p>
                <p className="text-sm text-gray-500 mt-1">
                  This is email number 1 of 3. In real life it would arrive 6 weeks before your customer runs out of gas.
                  Read it — this is exactly what your customers will see.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  At the bottom of the email you'll see a blue button: <strong>"Receive next demo email →"</strong>
                </p>
              </div>
            </li>

            {/* Step 4 */}
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center mt-0.5">4</span>
              <div>
                <p className="font-semibold text-gray-800">Tap "Receive next demo email" to move through the reminder sequence</p>
                <p className="text-sm text-gray-500 mt-1">
                  Each time you tap that button, the next reminder email is sent to your inbox — in real life these would be weeks apart.
                  There are 3 reminders in total. The final one includes an <strong>"Order gas now"</strong> button — tap it to see the
                  order experience your customer would go through.
                </p>
              </div>
            </li>

            {/* Step 5 */}
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white text-sm font-bold rounded-full flex items-center justify-center mt-0.5">5</span>
              <div>
                <p className="font-semibold text-gray-800">Log into your supplier dashboard to see the other side</p>
                <p className="text-sm text-gray-500 mt-1">
                  Once you've been through the customer experience, use the email and password saved above to log in as the supplier.
                  You'll see the customer you just registered, any orders placed, and how you'd manage deliveries.
                </p>
              </div>
            </li>

          </ol>
        </div>

        {/* QR Codes */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Your 3 demo QR codes</h2>
          <p className="text-sm text-gray-500 mb-4">
            Each code is a separate "customer tag". You can use all 3 to simulate multiple customers if you like.
            Start with any one of them.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {qrImages.map((dataUrl, i) => (
              <div key={i} className="flex flex-col items-center gap-2 p-3 border border-gray-100 rounded-xl">
                <img src={dataUrl} alt={`QR Code ${i + 1}`} className="w-36 h-36 border border-gray-200 rounded-lg" />
                <span className="text-xs text-gray-500 font-medium">Customer tag {i + 1}</span>
                <a
                  href={`${baseUrl}/scan/${qrCodes[i].id}`}
                  className="text-xs text-orange-500 underline text-center"
                >
                  Can't scan? Tap here instead
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
          <p className="text-sm text-gray-500 mb-3">
            Once you've been through the customer emails, come back here to log into your dashboard.
          </p>
          <Link
            href="/vendor/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            Go to your supplier dashboard →
          </Link>
          <p className="text-xs text-gray-400 mt-3">Use the email and password from the box above.</p>
        </div>

      </div>
    </div>
  );
}
