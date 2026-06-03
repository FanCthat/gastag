import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY!);

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
<p class="subtitle">Prepared for Karl Schroder | Confidential</p>

<p>Welcome, Karl. This manual walks you through everything you need to know about the GasTag system — from setting up a new gas supplier to what happens when a client runs out of gas. Read it from top to bottom the first time, and use it as a reference afterwards.</p>

<h2>What is GasTag?</h2>
<p>GasTag is a smart gas cylinder tracking system. Here's the simple version of how it works:</p>
<ol>
  <li>A gas supplier (we call them a <strong>Vendor</strong>) joins GasTag.</li>
  <li>You generate QR code stickers for that vendor and give them to the supplier.</li>
  <li>The supplier sticks one QR code on each client's gas cylinder.</li>
  <li>The client scans the QR code once to register — they enter their name, email, and what appliance the gas runs.</li>
  <li>GasTag calculates when their cylinder is likely to run out and sends them reminder emails automatically — 6 weeks before, 3 weeks before, and on the due date.</li>
  <li>When the client is ready, they tap a button to place a gas order — the supplier gets an email alert immediately.</li>
  <li>The supplier delivers and confirms it in their portal — the client gets a confirmation email and the clock starts again for the next cylinder.</li>
</ol>
<p><strong>Nobody needs to remember anything.</strong> The system does it all.</p>

<hr/>

<h2>Part 1 — Your Admin Login (Paul's Dashboard)</h2>
<p class="section-intro">This is the control centre. Only you and Paul have access here.</p>

<p><strong>Website:</strong> <span class="url">gastag.vercel.app/admin/login</span></p>
<p><strong>Email:</strong> paul@mobwatch.co.za &nbsp;|&nbsp; <strong>Password:</strong> (as set by Paul)</p>

<h3>What you can do from here:</h3>
<ul>
  <li><strong>Dashboard</strong> — see a quick overview: how many vendors, clients, active orders, and any overdue cylinders that need attention.</li>
  <li><strong>Vendors</strong> — add new gas suppliers, manage their accounts, and generate their QR codes.</li>
  <li><strong>QR Codes</strong> — see a summary of how many QR codes each vendor has and how many are still unregistered (not yet stuck on a cylinder).</li>
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
    <li><strong>Contact person</strong> — the name of the person who will log into GasTag</li>
    <li><strong>Login email</strong> — the email address they'll use to log in</li>
    <li><strong>Initial password</strong> — create a temporary password for them (they can't change it themselves yet, so keep it simple and tell them what it is)</li>
    <li><strong>Region / area</strong> — optional, e.g. "Cape Town North"</li>
  </ul>
</div>
<div class="step"><strong>Step 4.</strong> Click <strong>Create vendor</strong>. The vendor now exists in the system.</div>
<div class="step"><strong>Step 5.</strong> On the vendors list, find the new vendor and click <strong>Manage →</strong></div>
<div class="step"><strong>Step 6.</strong> On the vendor detail page, go to the <strong>Generate QR codes</strong> section. Type in how many codes you want (start with 20 or 50) and click <strong>Download ZIP</strong>. A ZIP file will download to your computer containing one PNG image per QR code.</div>
<div class="step"><strong>Step 7.</strong> Print the QR codes and hand them to the supplier — or send the ZIP file to whoever is printing the stickers.</div>

<div class="note">Each QR code is unique and linked to that vendor. A code can only be registered once. Once registered, scanning it again takes the client straight to their account page.</div>

<h3>Giving the supplier their login details:</h3>
<p>The supplier's portal is at: <span class="url">gastag.vercel.app/vendor/login</span></p>
<p>Give them their email address and the password you created in Step 3 above.</p>

<hr/>

<h2>Part 3 — The Supplier's Portal (Vendor Dashboard)</h2>
<p class="section-intro">This is what the gas supplier sees when they log in. Walk them through this.</p>

<p><strong>Website:</strong> <span class="url">gastag.vercel.app/vendor/login</span></p>

<h3>Orders tab (the main screen)</h3>
<p>This is where new gas orders appear. Every time a client places an order, it shows up here instantly — and the supplier also gets an email alert.</p>
<p>Each order card shows:</p>
<ul>
  <li>The client's name and email</li>
  <li>The delivery address</li>
  <li>Which cylinder sizes are needed</li>
  <li>When the order was placed</li>
</ul>
<p>When the supplier has made the delivery, they click the green <strong>Confirm delivery</strong> button on that order card. This tells GasTag the delivery is done, and:</p>
<ul>
  <li>The client gets a confirmation email</li>
  <li>The next reminder cycle starts automatically</li>
  <li>The order disappears from the pending list</li>
</ul>

<h3>Clients tab</h3>
<p>A list of all registered clients — their name, what cylinders they have, the next predicted empty date, and their delivery address. Dates shown in red or amber mean that cylinder is getting close to empty or is overdue.</p>

<div class="warning">Remind the supplier: they should confirm deliveries promptly. If a delivery isn't confirmed within 21 days of the predicted empty date, GasTag flags it as an escalation and sends Paul an alert.</div>

<hr/>

<h2>Part 4 — The Client Experience</h2>
<p class="section-intro">This is what happens from the client's side. You'll need to explain this to the supplier so they can explain it to their clients.</p>

<h3>Step 1: The client gets their QR sticker</h3>
<p>The supplier sticks a GasTag QR sticker on the client's gas cylinder. The sticker has a QR code on it.</p>

<h3>Step 2: The client scans and registers (once only)</h3>
<p>The client scans the QR code with their phone camera. They land on a registration page and fill in:</p>
<ul>
  <li>Their full name</li>
  <li>Their email address</li>
  <li>Their delivery address (where to bring the gas)</li>
  <li>Whether they prefer email notifications, push notifications, or both</li>
</ul>
<p>On the next screen they choose:</p>
<ul>
  <li>What the gas runs (stove, geyser, braai, patio heater, or other)</li>
  <li>The cylinder size in kg (shown on the cylinder itself)</li>
  <li>How long a cylinder usually lasts for them (optional — if they skip this, we use an industry average)</li>
</ul>
<p>That's it. They're registered. They get a welcome email with their predicted empty date.</p>

<h3>Step 3: GasTag sends automatic reminders</h3>
<p>The client doesn't need to do anything. GasTag sends them emails automatically:</p>
<table>
  <tr><th>When</th><th>What the client receives</th></tr>
  <tr><td>6 weeks before predicted empty date</td><td>Friendly heads-up email</td></tr>
  <tr><td>3 weeks before</td><td>Reminder email with order button</td></tr>
  <tr><td>On the predicted empty date</td><td>Final reminder to order now</td></tr>
  <tr><td>21 days after (if no order placed)</td><td>Escalation alert sent to Paul</td></tr>
</table>

<h3>Step 4: The client places an order</h3>
<p>When the client is ready to order, they either:</p>
<ul>
  <li>Click the link in any reminder email, or</li>
  <li>Scan their QR sticker again — it takes them straight to their account page</li>
</ul>
<p>From their account page they tap <strong>Order gas now</strong>. They confirm which cylinders they need and their delivery address, then tap <strong>Place order</strong>.</p>
<p>The supplier gets an email immediately. The client sees a confirmation screen with a button back to their account, where the order shows as <strong>Pending</strong>.</p>

<h3>Step 5: Delivery confirmed</h3>
<p>Once the supplier delivers and clicks <strong>Confirm delivery</strong>, the client gets an email saying their gas arrived and showing them their next predicted empty date.</p>

<h3>The client has more than one gas appliance?</h3>
<p>No problem. From their account page, they can tap <strong>+ Add appliance</strong> to register a second (or third) appliance. Each one gets its own prediction and reminder cycle. When they order, they can tick which cylinders they need in one go.</p>

<hr/>

<h2>Part 5 — Quick Reference</h2>

<table>
  <tr><th>Who</th><th>Where they go</th><th>What they do there</th></tr>
  <tr><td>You / Paul (Admin)</td><td>gastag.vercel.app/admin/login</td><td>Manage vendors, generate QR codes, view system stats</td></tr>
  <tr><td>Gas Supplier (Vendor)</td><td>gastag.vercel.app/vendor/login</td><td>See incoming orders, confirm deliveries, view client list</td></tr>
  <tr><td>End Client</td><td>Scan QR sticker</td><td>Register once, then place orders and receive reminders</td></tr>
</table>

<h3>Common questions:</h3>

<p><strong>What if a client loses their QR sticker?</strong><br/>
The supplier gives them a new one. The client scans it and registers again — the new sticker creates a new account for them.</p>

<p><strong>What if a client changes their delivery address?</strong><br/>
When they place an order, they can type a different address and tick "Save as my new default address" — GasTag updates their record automatically.</p>

<p><strong>What if the supplier forgets to confirm a delivery?</strong><br/>
After 21 days past the predicted empty date with no delivery confirmed, GasTag sends Paul an escalation alert so he can follow up.</p>

<p><strong>What if the prediction is wrong — the cylinder ran out earlier or later than expected?</strong><br/>
That's normal on the first cylinder — GasTag is just using an industry average. Once a delivery is confirmed, GasTag records how long that cylinder actually lasted and uses that real data to make better predictions next time. The more deliveries completed, the more accurate the predictions get.</p>

<p><strong>Who do clients or suppliers contact if something goes wrong?</strong><br/>
They contact you (Karl) or Paul directly. There is no public support system yet.</p>

<hr/>

<p style="color:#9ca3af;font-size:13px;">This manual was prepared for GasTag agent Karl Schroder. Please keep it confidential. For assistance contact paul@mobwatch.co.za.</p>

</body>
</html>
  `;

  try {
    const result = await resend.emails.send({
      from: "GasTag <noreply@mobwatch.co.za>",
      to: ["kschroder1@gmail.com", "paul@mobwatch.co.za"],
      subject: "GasTag — Your User Manual",
      html,
    });
    return NextResponse.json({ ok: true, id: result.data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
