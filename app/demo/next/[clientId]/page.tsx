export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import Link from "next/link";

const FROM = "GasTag <noreply@mobwatch.co.za>";
const baseUrl = process.env.APP_BASE_URL || "https://gastag.vercel.app";

export default async function DemoNextEmailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, email: true, vendor: { select: { isDemo: true } } },
  });

  if (!client) notFound();

  if (!client.vendor.isDemo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Not a demo account</h1>
          <p className="text-sm text-gray-500">This link is only valid for demo accounts.</p>
        </div>
      </div>
    );
  }

  const sentTypes = await prisma.notification.findMany({
    where: { clientId, type: { startsWith: "demo_" } },
    select: { type: true },
  });
  const sent = sentTypes.map(n => n.type);

  const reorderUrl = `${baseUrl}/reorder/${clientId}`;
  const nextDemoUrl = `${baseUrl}/demo/next/${clientId}`;

  let emailSent = false;
  let emailNumber = 0;
  let isLast = false;
  let allDone = false;

  if (!sent.includes("demo_3week")) {
    emailNumber = 2;
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `🔬 DEMO — Running low, 3 weeks to empty`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <div style="background:#f97316;color:white;padding:12px 20px;font-weight:bold;font-size:13px;border-radius:8px 8px 0 0;">
              🔬 DEMO MODE — In live operation, this email arrives 3 weeks before your cylinder is predicted empty.
            </div>
            <div style="background:white;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <h2 style="color:#111827;margin:0 0 12px;">Running low — order now to avoid running out, ${client.name}</h2>
              <p style="color:#374151;margin:0 0 12px;">Your cylinder(s) are getting low. With 3 weeks to go, now is the best time to place your order.</p>
              <p style="color:#374151;margin:0 0 20px;">Don't wait until you've run out — order now and we'll deliver before you need it.</p>
              <a href="${reorderUrl}" style="background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin:0 0 16px;">Order gas now →</a>
              <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e5e7eb;">
                <p style="color:#6b7280;font-size:13px;margin:0 0 10px;">Tap the button below to receive your next demo reminder email:</p>
                <a href="${nextDemoUrl}" style="background:#1e40af;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Receive next demo email →</a>
              </div>
            </div>
          </div>
        `,
      });

      await prisma.notification.create({
        data: {
          clientId,
          type: "demo_3week",
          scheduledFor: new Date(),
          sentAt: new Date(),
          channel: "email",
        },
      });

      emailSent = true;
    } catch (err) {
      console.error("Failed to send demo email 2", err);
    }
  } else if (!sent.includes("demo_duedate")) {
    emailNumber = 3;
    isLast = true;
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      await resend.emails.send({
        from: FROM,
        to: client.email,
        subject: `🔬 DEMO — Your cylinder is predicted empty today`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
            <div style="background:#f97316;color:white;padding:12px 20px;font-weight:bold;font-size:13px;border-radius:8px 8px 0 0;">
              🔬 DEMO MODE — In live operation, this email arrives on your cylinder's predicted empty date.
            </div>
            <div style="background:white;padding:28px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
              <h2 style="color:#111827;margin:0 0 12px;">Your cylinder is predicted empty today, ${client.name}</h2>
              <p style="color:#374151;margin:0 0 12px;">Based on your usage, your cylinder(s) are predicted to be empty today.</p>
              <p style="color:#374151;margin:0 0 20px;">Order now to avoid running out of gas.</p>
              <a href="${reorderUrl}" style="background:#f97316;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin:0 0 16px;">Order gas now →</a>
            </div>
          </div>
        `,
      });

      await prisma.notification.create({
        data: {
          clientId,
          type: "demo_duedate",
          scheduledFor: new Date(),
          sentAt: new Date(),
          channel: "email",
        },
      });

      emailSent = true;
    } catch (err) {
      console.error("Failed to send demo email 3", err);
    }
  } else {
    allDone = true;
  }

  if (allDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md text-center space-y-4">
          <div className="text-4xl">✅</div>
          <h1 className="text-xl font-bold text-gray-900">You've received all demo emails!</h1>
          <p className="text-sm text-gray-500">Check your inbox to see all 3 reminder emails. Now log into your supplier dashboard to see what your customers experience.</p>
          <Link
            href="/vendor/login"
            className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
          >
            Log into your supplier dashboard →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 max-w-md text-center space-y-4">
        <div className="text-4xl">✓</div>
        <h1 className="text-xl font-bold text-gray-900">
          {emailSent ? "Demo email sent!" : "Something went wrong"}
        </h1>
        {emailSent && (
          <>
            <p className="text-sm text-gray-600">
              Check your inbox at <strong>{client.email}</strong>
            </p>
            {!isLast ? (
              <>
                <p className="text-sm text-gray-500">
                  This is email {emailNumber} of 3. Tap below to receive the next one.
                </p>
                <Link
                  href={`/demo/next/${clientId}`}
                  className="inline-block bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Receive next demo email →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500">
                  You've received all 3 demo reminder emails.
                </p>
                <p className="text-sm text-gray-500">
                  Now log into your supplier dashboard to see what your customers experience.
                </p>
                <Link
                  href="/vendor/login"
                  className="inline-block bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
                >
                  Log into your supplier dashboard →
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
