import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

function buildWaLink(phone: string, contactName: string): string {
  const digits = phone.replace(/\D/g, "");
  const international = digits.startsWith("0") ? "27" + digits.slice(1) : digits;
  const text = encodeURIComponent(
    `Hi ${contactName}, it's Paul from GasTag — your trial has just ended and I wanted to follow up personally.`
  );
  return `https://wa.me/${international}?text=${text}`;
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret") ?? req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const log: string[] = [];
  let processed = 0;

  const expiredTrials = await prisma.vendor.findMany({
    where: { isTrial: true, trialEndsAt: { lte: now }, trialConvertedAt: null },
    include: {
      clients: { include: { orders: { select: { id: true } } } },
    },
  });

  log.push(`Found ${expiredTrials.length} expired trial(s)`);

  for (const vendor of expiredTrials) {
    const totalOrders = vendor.clients.reduce((sum, c) => sum + c.orders.length, 0);
    const clientCount = vendor.clients.length;
    const hasEngagement = totalOrders > 0;
    const portalUrl = `${process.env.APP_BASE_URL ?? "https://gastag.vercel.app"}/vendor`;
    const operatorEmail = process.env.OPERATOR_ALERT_EMAIL ?? process.env.ESCALATION_EMAIL;

    // 1 — Vendor summary email
    try {
      await sendEmail({
        to: vendor.contactEmail,
        subject: "Your GasTag trial is complete — here's what your clients will experience",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a16;">
            <div style="background:#0f3d28;padding:18px 24px;text-align:center;">
              <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.3px;">⬡ GasTag</span>
            </div>
            <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
              <p style="font-size:15px;font-weight:500;margin:0 0 16px;">Hi ${vendor.contactName},</p>
              <p style="color:#374151;line-height:1.65;margin:0 0 14px;">
                Your 7-day GasTag trial is now complete. Over the past week, your demo clients experienced
                the full reminder sequence your real customers will receive.
              </p>
              <p style="color:#374151;font-weight:600;margin:0 0 8px;">What they experienced:</p>
              <ul style="color:#374151;line-height:1.8;padding-left:20px;margin:0 0 16px;">
                <li><strong>6-week early warning</strong> — plenty of notice, no urgency yet</li>
                <li><strong>3-week reminder</strong> — prompting them to place an order</li>
                <li><strong>Reorder-day alert</strong> — one-tap link straight to your order queue</li>
              </ul>
              <p style="color:#374151;line-height:1.65;margin:0 0 16px;">
                Your vendor portal is ready at <a href="${portalUrl}" style="color:#d4650a;">${portalUrl}</a>.
                Log in anytime to see how the dashboard looks.
              </p>
              <p style="color:#374151;line-height:1.65;margin:0 0 24px;">
                <strong>Paul will be in touch shortly</strong> to discuss your keyring order and next steps.
                No action needed from you right now.
              </p>
              <p style="font-size:12px;color:#9ca3af;">
                Questions? Call or WhatsApp Paul on
                <a href="tel:+27824993552" style="color:#d4650a;">+27 82 499 3552</a>
              </p>
            </div>
          </div>
        `,
      });
      log.push(`vendor summary: sent to ${vendor.contactEmail}`);
    } catch (err: any) {
      log.push(`vendor summary: FAILED for ${vendor.name} — ${err.message}`);
    }

    // 2 — Operator alert (must arrive, is a sales trigger)
    if (operatorEmail) {
      const waHref = vendor.whatsapp ? buildWaLink(vendor.whatsapp, vendor.contactName) : null;
      try {
        await sendEmail({
          to: operatorEmail,
          subject: `GasTag trial ended — ${vendor.name} · Follow up now`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a16;">
              <div style="background:#0f3d28;padding:18px 24px;text-align:center;">
                <span style="font-size:16px;font-weight:700;color:#fff;letter-spacing:-0.3px;">⬡ GasTag — Operator Alert</span>
              </div>
              <div style="padding:28px 24px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;">
                <p style="font-size:18px;font-weight:700;margin:0 0 20px;">Trial ended: ${vendor.name}</p>
                <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 0;color:#6b7280;width:40%;">Company</td>
                    <td style="padding:8px 0;font-weight:600;">${vendor.name}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 0;color:#6b7280;">Contact</td>
                    <td style="padding:8px 0;font-weight:600;">${vendor.contactName}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 0;color:#6b7280;">Email</td>
                    <td style="padding:8px 0;"><a href="mailto:${vendor.contactEmail}" style="color:#d4650a;">${vendor.contactEmail}</a></td>
                  </tr>
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 0;color:#6b7280;">WhatsApp</td>
                    <td style="padding:8px 0;">${vendor.whatsapp ?? "—"}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 0;color:#6b7280;">Trial started</td>
                    <td style="padding:8px 0;">${vendor.trialStartedAt ? formatDate(vendor.trialStartedAt) : "—"}</td>
                  </tr>
                  <tr style="border-bottom:1px solid #f3f4f6;">
                    <td style="padding:8px 0;color:#6b7280;">Demo clients</td>
                    <td style="padding:8px 0;">${clientCount}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;">Reorders placed</td>
                    <td style="padding:8px 0;font-weight:700;color:${hasEngagement ? "#15803d" : "#b91c1c"};">
                      ${totalOrders} — ${hasEngagement ? "engaged ✓" : "no reorders"}
                    </td>
                  </tr>
                </table>
                ${waHref ? `
                <a href="${waHref}"
                   style="display:block;padding:14px;text-align:center;background:#25D366;color:#fff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none;margin-bottom:10px;">
                  WhatsApp ${vendor.contactName} now →
                </a>` : ""}
                <p style="font-size:12px;color:#9ca3af;text-align:center;margin-top:8px;">
                  Region: ${vendor.region ?? "—"}
                </p>
              </div>
            </div>
          `,
        });
        log.push(`operator alert: sent to ${operatorEmail}`);
      } catch (err: any) {
        log.push(`operator alert: FAILED for ${vendor.name} — ${err.message}`);
      }
    } else {
      log.push(`operator alert: skipped — OPERATOR_ALERT_EMAIL not set`);
    }

    // 3 — Flip trial fields
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { isTrial: false, trialConvertedAt: now },
    });
    log.push(`${vendor.name}: isTrial flipped to false, trialConvertedAt set`);
    processed++;
  }

  return NextResponse.json({ ok: true, processed, log });
}
