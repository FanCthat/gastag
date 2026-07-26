import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.APP_BASE_URL ?? "https://gastag.vercel.app";
const REORDER_URL = `${BASE_URL}/gastag-demo.html?complete=true`;

function emailContent(step: 1 | 2 | 3, email: string): { subject: string; html: string } {
  const banner = (offset: string) =>
    `<div style="background:#fff3cd;border-left:4px solid #d4a017;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#5a4500;font-family:sans-serif;line-height:1.5;">
      🔬 <strong>DEMO</strong> — in live operation this email arrives ${offset}.
    </div>`;

  const header = `
    <div style="background:#0f3d28;padding:18px 24px;text-align:center;">
      <span style="font-size:16px;font-weight:700;color:#fff;font-family:sans-serif;letter-spacing:-0.3px;">⬡ GasTag</span>
    </div>
    <div style="padding:24px 24px 0;border-bottom:1px solid #eee;margin-bottom:20px;">
      <span style="font-size:11px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.5px;font-family:sans-serif;">Your Company Name</span>
    </div>`;

  const footer = `
    <p style="font-size:11px;color:#aaa;text-align:center;margin-top:24px;font-family:sans-serif;line-height:1.5;">
      Your Company Gas · Powered by GasTag<br>
      To update your preferences, visit your account.
    </p>`;

  if (step === 1) {
    const nextUrl = `${BASE_URL}/gastag-demo.html?email=${encodeURIComponent(email)}&trigger=2`;
    return {
      subject: "Your stove cylinder — about 6 weeks to go 🟢",
      html: `
        <div style="background:#f5f3ee;padding:24px 0;font-family:sans-serif;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
            ${header}
            <div style="padding:0 24px 24px;">
              ${banner("6 weeks before your gas runs out")}
              <p style="font-size:15px;font-weight:500;color:#1a1a16;margin-bottom:10px;">Hi there 👋</p>
              <p style="font-size:14px;color:#3a3a36;line-height:1.65;margin-bottom:16px;">
                Based on your usage history, your stove gas cylinder should last about another <strong>6 weeks</strong>.<br><br>
                No need to do anything right now — we just wanted to give you plenty of notice so you're never caught without gas.
              </p>
              <div style="background:#f5f3ee;border-radius:10px;padding:14px 16px;margin-bottom:16px;display:flex;align-items:center;">
                <span style="font-size:22px;margin-right:12px;">🔵</span>
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:600;color:#1a1a16;">Kitchen Stove</div>
                  <div style="font-size:12px;color:#6b6a62;margin-top:2px;">9kg cylinder</div>
                </div>
                <span style="font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:#e8f5ee;color:#1a6644;">~6 weeks</span>
              </div>
              <p style="font-size:14px;color:#3a3a36;line-height:1.65;margin-bottom:0;">
                When you're ready to reorder, simply scan the <strong>GasTag keyring</strong> on your gas regulator — it takes less than a minute.
              </p>
              ${footer}
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;text-align:center;">
                <p style="font-size:11px;color:#aaa;margin-bottom:10px;font-family:sans-serif;">You're in the GasTag demo sequence</p>
                <a href="${nextUrl}" style="display:inline-block;padding:11px 22px;background:#1a6644;color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;font-family:sans-serif;">
                  Receive your 3-week reminder →
                </a>
              </div>
            </div>
          </div>
        </div>`,
    };
  }

  if (step === 2) {
    const nextUrl = `${BASE_URL}/gastag-demo.html?email=${encodeURIComponent(email)}&trigger=3`;
    return {
      subject: "Your stove cylinder — about 3 weeks left 🟠",
      html: `
        <div style="background:#f5f3ee;padding:24px 0;font-family:sans-serif;">
          <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
            ${header}
            <div style="padding:0 24px 24px;">
              ${banner("3 weeks before your gas runs out")}
              <p style="font-size:15px;font-weight:500;color:#1a1a16;margin-bottom:10px;">Hi there,</p>
              <p style="font-size:14px;color:#3a3a36;line-height:1.65;margin-bottom:16px;">
                Just a reminder — your stove cylinder is expected to run low in about <strong>3 weeks</strong>.<br><br>
                Now's a great time to place your reorder so delivery arrives before you need it.
              </p>
              <div style="background:#f5f3ee;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
                <span style="font-size:22px;margin-right:12px;">🟠</span>
                <span style="font-size:13px;font-weight:600;color:#1a1a16;">Kitchen Stove</span>
                <span style="font-size:12px;color:#6b6a62;margin-left:8px;">9kg cylinder</span>
                <span style="float:right;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:#fff4eb;color:#d4650a;">~3 weeks</span>
              </div>
              <a href="${REORDER_URL}" style="display:block;padding:15px;text-align:center;background:#d4650a;color:#fff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none;margin-bottom:14px;">
                Reorder Now — scan or tap here
              </a>
              ${footer}
              <div style="margin-top:20px;padding-top:16px;border-top:1px solid #eee;text-align:center;">
                <p style="font-size:11px;color:#aaa;margin-bottom:10px;font-family:sans-serif;">You're in the GasTag demo sequence</p>
                <a href="${nextUrl}" style="display:inline-block;padding:11px 22px;background:#1a6644;color:#fff;font-size:13px;font-weight:600;border-radius:8px;text-decoration:none;font-family:sans-serif;">
                  Receive your final reminder →
                </a>
              </div>
            </div>
          </div>
        </div>`,
    };
  }

  // step === 3
  return {
    subject: "Your stove cylinder is due now 🔴",
    html: `
      <div style="background:#f5f3ee;padding:24px 0;font-family:sans-serif;">
        <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.07);">
          ${header}
          <div style="padding:0 24px 24px;">
            ${banner("on the day your gas is estimated to run out")}
            <p style="font-size:15px;font-weight:500;color:#1a1a16;margin-bottom:10px;">Hi there,</p>
            <p style="font-size:14px;color:#3a3a36;line-height:1.65;margin-bottom:16px;">
              Your stove cylinder is <strong>due for replacement now</strong>.<br><br>
              Tap the button below to reorder in under a minute — before you're left without gas.
            </p>
            <div style="background:#f5f3ee;border-radius:10px;padding:14px 16px;margin-bottom:16px;">
              <span style="font-size:22px;margin-right:12px;">🔴</span>
              <span style="font-size:13px;font-weight:600;color:#1a1a16;">Kitchen Stove</span>
              <span style="font-size:12px;color:#6b6a62;margin-left:8px;">9kg cylinder</span>
              <span style="float:right;font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;background:#fdecea;color:#c0311a;">Due now</span>
            </div>
            <a href="${REORDER_URL}" style="display:block;padding:15px;text-align:center;background:#c0311a;color:#fff;font-size:15px;font-weight:600;border-radius:10px;text-decoration:none;margin-bottom:14px;">
              Reorder Now — one tap, done ›
            </a>
            <p style="font-size:13px;color:#6b6a62;text-align:center;line-height:1.5;margin-bottom:0;">
              Your delivery address and cylinder details are already saved — just confirm and we'll handle the rest.
            </p>
            ${footer}
          </div>
        </div>
      </div>`,
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const { email, step } = body as { email?: string; step?: number };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if (step !== 1 && step !== 2 && step !== 3) {
    return NextResponse.json({ error: "Invalid step." }, { status: 400 });
  }

  const { subject, html } = emailContent(step, email);

  try {
    await sendEmail({ to: email, subject, html });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[send-demo-email]", err);
    return NextResponse.json({ error: "Failed to send email." }, { status: 500 });
  }
}
