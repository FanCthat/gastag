import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const recipients = req.nextUrl.searchParams.get("to") === "karl"
    ? ["kschroder1@gmail.com", "paul@mobwatch.co.za"]
    : ["paul@mobwatch.co.za"];

  const BASE = "gastag.vercel.app";

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 720px; margin: 0 auto; padding: 24px; font-size: 15px; line-height: 1.6; }
  h1 { color: #f97316; font-size: 26px; margin-bottom: 4px; }
  h2 { color: #f97316; font-size: 18px; border-bottom: 2px solid #fed7aa; padding-bottom: 6px; margin-top: 36px; }
  h3 { color: #374151; font-size: 15px; margin-top: 20px; margin-bottom: 6px; }
  .subtitle { color: #6b7280; font-size: 13px; margin-bottom: 28px; }
  .scenario { background: #fff7ed; border-left: 4px solid #f97316; padding: 14px 18px; margin: 16px 0; border-radius: 0 10px 10px 0; }
  .scenario h3 { margin-top: 0; color: #c2410c; }
  .step { margin: 8px 0; padding-left: 8px; }
  .step b { color: #1a1a1a; }
  .check { color: #16a34a; font-weight: bold; }
  .note { background: #f0fdf4; border: 1px solid #86efac; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 10px 0; color: #166534; }
  .warn { background: #fefce8; border: 1px solid #fde047; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 10px 0; color: #713f12; }
  .creds { background: #1e293b; color: #f1f5f9; padding: 14px 18px; border-radius: 10px; font-family: monospace; font-size: 13px; margin: 12px 0; line-height: 1.8; }
  .creds span { color: #fb923c; }
  .url { background: #f3f4f6; padding: 3px 7px; border-radius: 4px; font-family: monospace; font-size: 12px; color: #1d4ed8; }
  .pass { background: #f3f4f6; padding: 3px 7px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #1a1a1a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 10px 0; }
  th { background: #f97316; color: white; text-align: left; padding: 7px 10px; }
  td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .num { display: inline-block; background: #f97316; color: white; border-radius: 50%; width: 22px; height: 22px; text-align: center; line-height: 22px; font-size: 12px; font-weight: bold; margin-right: 6px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 28px 0; }
  .tag { display: inline-block; background: #e0f2fe; color: #0369a1; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; margin-left: 6px; vertical-align: middle; }
  .tag.karl { background: #fce7f3; color: #9d174d; }
  .tag.paul { background: #ede9fe; color: #5b21b6; }
</style>
</head>
<body>

<h1>GasTag — End-to-End Test Pack</h1>
<p class="subtitle">Paul &amp; Karl &nbsp;|&nbsp; June 2026 &nbsp;|&nbsp; Run through every scenario once before going live</p>

<p>This test pack walks you through every part of the GasTag system in the right order. Work through it together — one person drives the admin/vendor side, the other drives the client side. Tick each ✓ check as you go.</p>

<div class="note">
  <strong>Before you start:</strong> Use a real email address you can both check. All emails send from <strong>noreply@mobwatch.co.za</strong> via Resend — check spam if you don't see them.
</div>

<h2>Login Credentials</h2>
<div class="creds">
  <span>Admin portal:</span> ${BASE}/admin/login<br/>
  <span>Paul login:</span> paul@mobwatch.co.za &nbsp;/&nbsp; Fant0mas12321<br/>
  <span>Karl login:</span> kschroder1@gmail.com &nbsp;/&nbsp; GasTag@Karl2026<br/>
  <br/>
  <span>Vendor portal:</span> ${BASE}/vendor/login<br/>
  <span>(you'll create the test vendor's credentials in Scenario 1)</span>
</div>

<hr/>

<!-- SCENARIO 1 -->
<div class="scenario">
  <h3><span class="num">1</span> Create a test vendor <span class="tag paul">Admin</span></h3>
  <p style="font-size:13px;color:#555;margin:0 0 10px;">Either Paul or Karl does this — one admin login is enough.</p>

  <div class="step"><span class="num">→</span> Log into <span class="url">${BASE}/admin/login</span></div>
  <div class="step"><span class="num">→</span> Click <b>Vendors</b> in the sidebar → <b>+ Add vendor</b></div>
  <div class="step"><span class="num">→</span> Fill in: Name = <b>GasTag Test Supplier</b>, leave everything else as default → <b>Create</b></div>
  <div class="step"><span class="num">→</span> Back on Vendors list, click <b>Manage →</b> next to GasTag Test Supplier</div>
  <div class="step"><span class="num">→</span> Click the key icon 🔑 to set vendor login credentials:<br/>
    &nbsp;&nbsp;&nbsp;Email: <span class="pass">testvendor@gastag.co.za</span> &nbsp; Password: <span class="pass">GasTag@Test1</span></div>
  <div class="step"><span class="num">→</span> In the <b>Generate QR Codes</b> section, enter <b>5</b> and click <b>Download ZIP</b></div>
  <div class="step"><span class="num">→</span> Open the ZIP — you'll see 5 PNG images, each a QR code</div>
  <br/>
  <span class="check">✓ ZIP downloaded with 5 QR code PNGs</span><br/>
  <span class="check">✓ Admin dashboard shows GasTag Test Supplier in the vendor list</span>
</div>

<!-- SCENARIO 2 -->
<div class="scenario">
  <h3><span class="num">2</span> Register as a client (scan a QR code) <span class="tag karl">Client</span></h3>
  <p style="font-size:13px;color:#555;margin:0 0 10px;">The other person does this on their phone or computer.</p>

  <div class="step"><span class="num">→</span> Open one of the QR code PNGs on your screen</div>
  <div class="step"><span class="num">→</span> Scan it with your phone camera (or right-click → open in browser if on computer)</div>
  <div class="step"><span class="num">→</span> Fill in the registration form: your real name, a real email you can check, a delivery address</div>
  <div class="step"><span class="num">→</span> On the next screen (Your appliance): choose <b>Stove / Hob</b>, <b>9kg</b>, and enter <b>3</b> in the duration field (= 3 months)</div>
  <div class="step"><span class="num">→</span> Submit → you'll see a confirmation screen</div>
  <div class="step"><span class="num">→</span> Click <b>Go to my account →</b></div>
  <br/>
  <span class="check">✓ Account page shows: Stove (9kg cylinder) — Predicted empty roughly 3 months from today</span><br/>
  <span class="check">✓ Welcome email arrives at the email address you entered</span><br/>
  <span class="check">✓ Admin dashboard: Registered clients count has gone up by 1</span>
</div>

<!-- SCENARIO 3 -->
<div class="scenario">
  <h3><span class="num">3</span> Add a second appliance <span class="tag karl">Client</span></h3>

  <div class="step"><span class="num">→</span> From your account page, click <b>+ Add appliance</b></div>
  <div class="step"><span class="num">→</span> Choose <b>Gas geyser</b>, <b>14kg</b>, duration <b>4</b> (= 4 months) → <b>Add appliance</b></div>
  <div class="step"><span class="num">→</span> Click <b>Back to my account →</b></div>
  <br/>
  <span class="check">✓ Account page now shows <b>two</b> cylinder cards — Stove (9kg) and Geyser (14kg) — each with its own predicted empty date</span><br/>
  <span class="check">✓ A second confirmation email arrives for the geyser</span>
</div>

<!-- SCENARIO 4 -->
<div class="scenario">
  <h3><span class="num">4</span> Place a gas order <span class="tag karl">Client</span> + <span class="tag paul">Vendor</span></h3>

  <div class="step"><span class="num">→</span> From the account page, click <b>Order gas now</b></div>
  <div class="step"><span class="num">→</span> Tick both cylinders → confirm the delivery address → <b>Place order</b></div>
  <div class="step"><span class="num">→</span> You'll see an "Order received" confirmation</div>
  <br/>
  <span class="check">✓ Order confirmation appears on screen</span><br/>
  <span class="check">✓ Scanning the same QR code again shows the order as <b>pending</b> on the account page</span><br/>
  <span class="check">✓ The vendor receives an email notification about the new order</span>

  <h3 style="margin-top:18px;">Now confirm the delivery (vendor side)</h3>
  <div class="step"><span class="num">→</span> Log into <span class="url">${BASE}/vendor/login</span> with <span class="pass">testvendor@gastag.co.za</span> / <span class="pass">GasTag@Test1</span></div>
  <div class="step"><span class="num">→</span> The order appears in the <b>Orders</b> tab</div>
  <div class="step"><span class="num">→</span> Click <b>Confirm delivery</b></div>
  <br/>
  <span class="check">✓ Order disappears from the vendor's pending list</span><br/>
  <span class="check">✓ Client receives a delivery confirmation email with next predicted empty dates</span><br/>
  <span class="check">✓ Client account page now shows new predicted empty dates (approximately 3 and 4 months from today)</span><br/>
  <span class="check">✓ Admin dashboard: Active orders count is back to 0</span><br/>
  <span class="check">✓ Admin → Orders: the order shows as <b>delivered</b></span>
</div>

<!-- SCENARIO 5 -->
<div class="scenario">
  <h3><span class="num">5</span> Replace a lost keyring tag <span class="tag paul">Admin</span></h3>

  <div class="step"><span class="num">→</span> In Admin → Vendors → Manage (GasTag Test Supplier)</div>
  <div class="step"><span class="num">→</span> Scroll to the <b>Replace a client's lost tag</b> section</div>
  <div class="step"><span class="num">→</span> Select your test client from the dropdown and an unused QR code → <b>Replace tag</b></div>
  <div class="step"><span class="num">→</span> Try scanning the <b>original</b> QR code (the one you registered with)</div>
  <div class="step"><span class="num">→</span> Try scanning the <b>new</b> QR code</div>
  <br/>
  <span class="check">✓ Old QR code shows a friendly "this tag has been replaced" message</span><br/>
  <span class="check">✓ New QR code goes straight to the same client account — history intact</span>
</div>

<!-- SCENARIO 6 -->
<div class="scenario">
  <h3><span class="num">6</span> Check the admin Orders page <span class="tag paul">Admin</span></h3>

  <div class="step"><span class="num">→</span> Admin → <b>Orders</b> in the sidebar</div>
  <br/>
  <span class="check">✓ The order from Scenario 4 shows here with status <b>delivered</b></span><br/>
  <span class="check">✓ "No pending orders" banner is shown (all caught up)</span>
</div>

<!-- SCENARIO 7 -->
<div class="scenario">
  <h3><span class="num">7</span> Test all four reminder emails <span class="tag paul">Admin</span></h3>
  <p style="font-size:13px;color:#555;margin:0 0 10px;">
    Normally reminders fire at 6 weeks, 3 weeks, on the due date, and 21 days overdue — impossible to wait for in a test session.
    This scenario fires all four immediately so you can check the email content.
  </p>

  <div class="step"><span class="num">→</span> Look at the URL of your client account page — it ends with a long ID, e.g.<br/>
    &nbsp;&nbsp;&nbsp;<span class="url">${BASE}/account/<b>clxxxxxxxxxxxxx</b></span><br/>
    &nbsp;&nbsp;&nbsp;Copy that ID.
  </div>
  <div class="step"><span class="num">→</span> In your browser, visit this URL (replace YOUR_CLIENT_ID):<br/>
    &nbsp;&nbsp;&nbsp;<span class="url">${BASE}/api/admin/test-notifications?secret=gastag-cron-secret&clientId=YOUR_CLIENT_ID</span>
  </div>
  <div class="step"><span class="num">→</span> You should see a JSON response saying <b>ok: true</b> and <b>notificationsCreated: 8</b> (4 per appliance)</div>
  <div class="step"><span class="num">→</span> Immediately visit this URL to fire the cron:<br/>
    &nbsp;&nbsp;&nbsp;<span class="url">${BASE}/api/cron/notify?secret=gastag-cron-secret</span>
  </div>
  <div class="step"><span class="num">→</span> You should see <b>sent: 8</b> in the response</div>
  <br/>
  <span class="check">✓ You receive 8 reminder emails — 4 per cylinder (6-week warning, 3-week warning, due date, overdue escalation)</span><br/>
  <span class="check">✓ Each email references the correct appliance and predicted empty date</span><br/>
  <span class="check">✓ Paul also receives the two escalation alert emails (one per cylinder)</span>
  <div class="note" style="margin-top:10px;">
    <strong>Alternatively, use the email address</strong> instead of the client ID:<br/>
    <span class="url">${BASE}/api/admin/test-notifications?secret=gastag-cron-secret&email=YOUR_EMAIL</span>
  </div>
</div>

<hr/>

<h2>What to do if something fails</h2>
<table>
  <tr><th>Symptom</th><th>What to check</th></tr>
  <tr><td>Email didn't arrive</td><td>Check spam folder. If not there after 5 minutes, call Paul — the Resend key may need checking.</td></tr>
  <tr><td>QR code scan goes to error page</td><td>Make sure you're scanning a PNG from the downloaded ZIP, not one you've already used to register.</td></tr>
  <tr><td>"Confirm delivery" button shows an error</td><td>Make sure you're logged into the vendor portal as <span class="pass">testvendor@gastag.co.za</span> — not a different vendor.</td></tr>
  <tr><td>Predicted empty date shows today or a past date</td><td>This was a known bug — it's been fixed. If you still see it, note down exactly what steps you took and tell Paul.</td></tr>
  <tr><td>Account page shows one cylinder but not the other</td><td>Go back and re-add the missing appliance. If it fails again, note the error and tell Paul.</td></tr>
</table>

<h2>What we're NOT testing today</h2>
<ul style="font-size:13px;color:#555;">
  <li>Push notifications (requires a physical Android device with the browser open)</li>
  <li>Real-world reminder timing (the actual 6-week/3-week cadence) — Scenario 7 fires them all at once to verify content, not spacing</li>
</ul>

<hr/>
<p style="color:#9ca3af;font-size:12px;">GasTag Test Pack — June 2026. Questions? Call or WhatsApp <strong>+27 82 499 3552</strong>.</p>

</body>
</html>
  `;

  try {
    for (const to of recipients) {
      await sendEmail({ to, subject: "GasTag — End-to-End Test Pack", html, from: "GasTag <noreply@mobwatch.co.za>" });
    }
    return NextResponse.json({ ok: true, sentTo: recipients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
