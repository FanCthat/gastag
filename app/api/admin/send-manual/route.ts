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

  const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  body { font-family: Arial, sans-serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 24px; font-size: 15px; line-height: 1.6; }
  h1 { color: #f97316; font-size: 28px; margin-bottom: 4px; }
  h2 { color: #f97316; font-size: 20px; border-bottom: 2px solid #fed7aa; padding-bottom: 6px; margin-top: 36px; }
  h3 { color: #374151; font-size: 16px; margin-top: 24px; margin-bottom: 8px; }
  .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 32px; }
  .step { background: #fff7ed; border-left: 4px solid #f97316; padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; }
  .step strong { color: #c2410c; }
  .note { background: #f0fdf4; border: 1px solid #86efac; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 12px 0; color: #166534; }
  .warning { background: #fefce8; border: 1px solid #fde047; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin: 12px 0; color: #713f12; }
  .creds { background: #1e293b; color: #f1f5f9; padding: 16px 20px; border-radius: 10px; font-family: monospace; font-size: 14px; margin: 16px 0; }
  .creds span { color: #fb923c; }
  .url { background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #1d4ed8; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  th { background: #f97316; color: white; text-align: left; padding: 8px 12px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  .section-intro { color: #4b5563; font-size: 14px; margin-bottom: 16px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 32px 0; }
</style>
</head>
<body>

<h1>GasTag — User Manual</h1>
<p class="subtitle">Prepared for Karl Schroder &nbsp;|&nbsp; Confidential &nbsp;|&nbsp; June 2026</p>

<p>Welcome, Karl. This manual walks you through everything you need to know about the GasTag system — from setting up a new gas supplier to what happens when a client places an order. Read it from top to bottom the first time, and use it as a reference afterwards.</p>

<h2>Your Admin Login Credentials</h2>
<div class="creds">
  <span>Website:</span> gastag.vercel.app/admin/login<br/>
  <span>Email:</span> kschroder1@gmail.com<br/>
  <span>Password:</span> GasTag@Karl2026
</div>
<div class="warning">Please keep these credentials confidential. You have full administrator access — the same as Paul.</div>

<h2>What is GasTag?</h2>
<p>GasTag is a smart gas cylinder tracking system. Here's how it works from start to finish:</p>
<ol>
  <li>A gas supplier (we call them a <strong>Vendor</strong>) joins GasTag.</li>
  <li>You generate QR codes for that vendor, send them to the printer, and they are made into <strong>domed keyring tags</strong> — one side has the supplier's logo, the other has the QR code. The supplier distributes these to their clients.</li>
  <li>The client scans the QR code once to register — they enter their name, email, delivery address, and identify the gas appliances they run on cylinders.</li>
  <li>GasTag calculates when each cylinder is likely to run out, based on the client's own estimate, and sends automatic reminder emails — 6 weeks before, 3 weeks before, and on the due date.</li>
  <li>When the client is ready to order, they scan their keyring tag and tap a button — the supplier gets an email alert immediately.</li>
  <li>The supplier delivers and confirms it in their portal — the client gets a confirmation email and the clock starts again for the next cylinder.</li>
</ol>
<p><strong>Nobody needs to remember anything.</strong> The system does it all.</p>

<hr/>

<h2>Part 1 — The Admin Dashboard</h2>
<p class="section-intro">This is the control centre. Only you and Paul have access here.</p>

<p><strong>Website:</strong> <span class="url">gastag.vercel.app/admin/login</span></p>

<h3>What you can do from here:</h3>
<ul>
  <li><strong>Dashboard</strong> — see a quick overview: how many vendors, clients, active orders, and any overdue cylinders that need attention.</li>
  <li><strong>Vendors</strong> — add new gas suppliers, manage their accounts, and generate their QR codes.</li>
  <li><strong>QR Codes</strong> — see a summary of how many QR codes each vendor has and how many are still unregistered (not yet given to a client).</li>
  <li><strong>Notification Templates</strong> — edit the wording of the automatic reminder emails if needed.</li>
</ul>

<hr/>

<h2>Part 2 — Onboarding a New Gas Supplier (Vendor)</h2>
<p class="section-intro">Do this when a new gas supplier joins GasTag.</p>

<div class="step"><strong>Step 1.</strong> Log into the admin at <span class="url">gastag.vercel.app/admin/login</span></div>
<div class="step"><strong>Step 2.</strong> Click <strong>Vendors</strong> in the left menu, then click the orange <strong>+ Add vendor</strong> button.</div>
<div class="step"><strong>Step 3.</strong> Fill in the form:
  <ul>
    <li><strong>Business name</strong> — the name of the gas supplier's company</li>
    <li><strong>Contact person</strong> — the name of the person who will log in to GasTag</li>
    <li><strong>Login email</strong> — the email address they'll use to log in</li>
    <li><strong>Initial password</strong> — create a temporary password for them and tell them what it is</li>
    <li><strong>Region / area</strong> — optional, e.g. "Cape Town North"</li>
  </ul>
</div>
<div class="step"><strong>Step 4.</strong> Click <strong>Create vendor</strong>.</div>
<div class="step"><strong>Step 5.</strong> On the vendors list, click <strong>Manage →</strong> next to the new vendor.</div>
<div class="step"><strong>Step 6.</strong> In the <strong>Generate QR codes</strong> section, type in how many codes you want (start with 20–50) and click <strong>Download ZIP</strong>. A ZIP file downloads with one PNG image per QR code.</div>
<div class="step"><strong>Step 7.</strong> Send the ZIP to your printer. They produce domed keyring tags — supplier logo on one side, QR code on the other — and deliver them to the supplier.</div>

<div class="note">Each QR code is unique and linked to that vendor. Once a client registers with a code, scanning it again takes them straight to their account.</div>

<h3>Giving the supplier their login details:</h3>
<p>Supplier portal: <span class="url">gastag.vercel.app/vendor/login</span></p>
<p>Share their email and the password you set in Step 3.</p>

<hr/>

<h2>Part 3 — What to Do if a Client Loses Their Keyring Tag</h2>
<p class="section-intro">The client's account and history are never lost — only the physical tag needs replacing.</p>

<div class="step"><strong>Step 1.</strong> Get a replacement QR code from the supplier's unregistered pool (they should always have spares — if not, generate more from the admin).</div>
<div class="step"><strong>Step 2.</strong> Log into the admin, go to <strong>Vendors → Manage →</strong> for that supplier.</div>
<div class="step"><strong>Step 3.</strong> Scroll to the <strong>Replace a client's lost keyring tag</strong> section at the bottom of the page.</div>
<div class="step"><strong>Step 4.</strong> Select the client from the dropdown, select an unregistered QR code, and click <strong>Replace tag</strong>.</div>
<div class="step"><strong>Step 5.</strong> The new tag is now linked to the client's existing account. Their order history and cylinder predictions are all preserved. When they scan the new tag, they land on their account as usual.</div>

<div class="note">The old tag is deactivated. If anyone scans it, they'll see a message saying the tag has been replaced.</div>

<hr/>

<h2>Part 4 — The Supplier's Portal (Vendor Dashboard)</h2>
<p class="section-intro">This is what the gas supplier sees when they log in. Walk them through this when you onboard them.</p>

<p><strong>Website:</strong> <span class="url">gastag.vercel.app/vendor/login</span></p>

<h3>Orders tab (the main screen)</h3>
<p>This is where new gas orders appear. Every time a client places an order, it shows up here instantly — and the supplier also gets an email alert.</p>
<p>Each order card shows the client's name, delivery address, which cylinder sizes are needed, and when the order was placed.</p>
<p>When the supplier has made the delivery, they click the green <strong>Confirm delivery</strong> button. This tells GasTag the delivery is done, and:</p>
<ul>
  <li>The client gets a confirmation email with their next predicted empty date</li>
  <li>The next reminder cycle starts automatically</li>
  <li>The order disappears from the pending list</li>
</ul>

<h3>Clients tab</h3>
<p>A list of all registered clients — their name, appliances, next predicted empty date, and delivery address. Dates shown in red mean the cylinder is overdue or very close to empty.</p>

<div class="warning">Remind the supplier: they should confirm deliveries promptly. If a delivery is not confirmed within 21 days after the predicted empty date, GasTag flags it as an escalation and alerts Paul and Karl.</div>

<hr/>

<h2>Part 5 — The Client Experience</h2>
<p class="section-intro">This is what happens from the client's point of view. Explain this to the supplier so they can walk their clients through it.</p>

<h3>Step 1: The client gets their GasTag keyring tag</h3>
<p>The supplier hands the client a domed keyring tag. One side has the supplier's logo; the other side has the QR code. The client attaches it to their keys so it's always with them.</p>

<h3>Step 2: The client scans and registers (once only)</h3>
<p>The client scans the QR code on the tag with their phone camera — no app needed, the phone's built-in camera does it. They land on a registration page and fill in:</p>
<ul>
  <li>Their full name</li>
  <li>Their email address</li>
  <li>Their delivery address (where to bring the gas)</li>
  <li>Whether they prefer email notifications or push notifications or both</li>
</ul>
<p>On the next screen they identify their gas appliances — for each one they choose what it is (stove, geyser, braai, etc.), the cylinder size in kg, and how long a cylinder usually lasts for them. That last part is important — GasTag uses their own estimate to predict when their cylinder will run out. If they don't know, they can leave it blank and GasTag will use a standard industry average instead.</p>
<p>That's it. They're registered. They immediately receive a welcome email confirming their predicted empty date.</p>

<h3>Step 3: Automatic reminders — the client doesn't need to do anything</h3>
<table>
  <tr><th>When</th><th>What the client receives</th></tr>
  <tr><td>6 weeks before predicted empty date</td><td>Friendly heads-up email</td></tr>
  <tr><td>3 weeks before</td><td>Reminder email with order button</td></tr>
  <tr><td>On the predicted empty date</td><td>Final reminder to order now</td></tr>
  <tr><td>21 days after (if no order placed)</td><td>Escalation alert sent to Karl and Paul</td></tr>
</table>

<h3>Step 4: Placing an order</h3>
<p>When the client is ready to order, they scan their keyring tag — it takes them straight to their account page. From there they tap <strong>Order gas now</strong>, confirm which cylinders they need and their delivery address, then tap <strong>Place order</strong>.</p>
<p>The supplier gets an email immediately. The client sees a confirmation screen and can tap <strong>View my account →</strong> to see the order listed as Pending.</p>

<h3>Step 5: After delivery</h3>
<p>Once the supplier confirms delivery in their portal, the client gets an email confirming their gas arrived, along with their next predicted empty date. GasTag then starts the next reminder cycle automatically.</p>

<h3>The client has more than one gas appliance?</h3>
<p>From their account page, they tap <strong>+ Add appliance</strong> to register another one. Each appliance gets its own prediction and reminder cycle. When ordering, they tick which cylinders they need in one go.</p>

<hr/>

<h2>Part 6 — Quick Reference</h2>

<table>
  <tr><th>Who</th><th>Website</th><th>What they do there</th></tr>
  <tr><td>Karl / Paul (Admin)</td><td>gastag.vercel.app/admin/login</td><td>Manage vendors, generate QR codes, replace lost tags, view system stats</td></tr>
  <tr><td>Gas Supplier (Vendor)</td><td>gastag.vercel.app/vendor/login</td><td>See incoming orders, confirm deliveries, view client list</td></tr>
  <tr><td>End Client</td><td>Scan keyring tag</td><td>Register once, place orders, receive automatic reminders</td></tr>
</table>

<h3>Common questions:</h3>

<p><strong>What if a client loses their keyring tag?</strong><br/>
See Part 3 above. The client's account and history are never lost. You simply link a new tag to their existing account in the admin — takes about 30 seconds.</p>

<p><strong>What if a client changes their delivery address?</strong><br/>
When they place an order, they can type a different address and tick "Save as my new default address" — GasTag updates their record automatically.</p>

<p><strong>What if the supplier forgets to confirm a delivery?</strong><br/>
After 21 days past the predicted empty date with no confirmation, GasTag sends Karl and Paul an escalation alert to follow up.</p>

<p><strong>What if the prediction is wrong?</strong><br/>
GasTag always starts with the client's own estimate of how long a cylinder lasts. If they didn't provide one, it uses an industry average as a starting point. Either way, once a delivery is confirmed, GasTag records how long that cylinder actually lasted and uses that real data to make better predictions next time. The system gets more accurate with every delivery.</p>

<p><strong>Who do clients or suppliers call if something goes wrong?</strong><br/>
They can call or WhatsApp <strong>+27 82 499 3552</strong>. This number also appears on the client account page and in all emails.</p>

<hr/>

<p style="color:#9ca3af;font-size:13px;">GasTag User Manual — prepared June 2026. Confidential. Contact paul@mobwatch.co.za for assistance.</p>

</body>
</html>
  `;

  try {
    const subject = "GasTag — User Manual" + (recipients.length > 1 ? "" : " (review copy)");
    for (const to of recipients) {
      await sendEmail({ to, subject, html, from: "GasTag <noreply@mobwatch.co.za>" });
    }
    return NextResponse.json({ ok: true, sentTo: recipients });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
