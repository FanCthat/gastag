import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Super admin
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@gastag.co.za";
  const password = process.env.SUPER_ADMIN_PASSWORD || "change-me-now";
  const hash = await bcrypt.hash(password, 12);
  await prisma.superAdmin.upsert({
    where: { email },
    update: {},
    create: { email, password: hash },
  });

  // Industry averages (months per cylinder size)
  const averages = [
    { cylinderSizeKg: 3, avgDurationMonths: 1 },
    { cylinderSizeKg: 5, avgDurationMonths: 1.5 },
    { cylinderSizeKg: 7, avgDurationMonths: 2 },
    { cylinderSizeKg: 9, avgDurationMonths: 2.5 },
    { cylinderSizeKg: 14, avgDurationMonths: 4 },
    { cylinderSizeKg: 19, avgDurationMonths: 5.5 },
    { cylinderSizeKg: 48, avgDurationMonths: 14 },
  ];
  for (const avg of averages) {
    await prisma.industryAverage.upsert({
      where: { cylinderSizeKg: avg.cylinderSizeKg },
      update: { avgDurationMonths: avg.avgDurationMonths },
      create: avg,
    });
  }

  // Default notification templates
  const templates = [
    {
      type: "6week",
      subject: "Your gas cylinder is due in about 6 weeks",
      bodyHtml: `<p>Hi {{clientName}},</p><p>Just a heads-up — your <strong>{{applianceType}}</strong> cylinder is predicted to run out around <strong>{{predictedEmptyDate}}</strong>. That's about 6 weeks away.</p><p><a href="{{reorderUrl}}">Order your replacement now →</a></p>`,
      bodyText: `Hi {{clientName}}, your {{applianceType}} cylinder is predicted to run out around {{predictedEmptyDate}} (about 6 weeks). Order now: {{reorderUrl}}`,
    },
    {
      type: "3week",
      subject: "3 weeks until your gas runs out",
      bodyHtml: `<p>Hi {{clientName}},</p><p>Your <strong>{{applianceType}}</strong> cylinder is predicted to run out around <strong>{{predictedEmptyDate}}</strong> — just 3 weeks away.</p><p><a href="{{reorderUrl}}">Place your order now →</a></p>`,
      bodyText: `Hi {{clientName}}, your {{applianceType}} cylinder runs out around {{predictedEmptyDate}} — 3 weeks away. Order: {{reorderUrl}}`,
    },
    {
      type: "duedate",
      subject: "Your gas cylinder is due today",
      bodyHtml: `<p>Hi {{clientName}},</p><p>Today is the predicted empty date for your <strong>{{applianceType}}</strong> cylinder. If you haven't ordered yet, now is the time.</p><p><a href="{{reorderUrl}}">Order your replacement →</a></p>`,
      bodyText: `Hi {{clientName}}, today is the predicted empty date for your {{applianceType}} cylinder. Order now: {{reorderUrl}}`,
    },
    {
      type: "escalation",
      subject: "ESCALATION: Client cylinder overdue",
      bodyHtml: `<p><strong>Client:</strong> {{clientName}} ({{clientEmail}})<br/><strong>Appliance:</strong> {{applianceType}}<br/><strong>Predicted empty:</strong> {{predictedEmptyDate}}<br/><strong>Days overdue:</strong> {{daysOverdue}}</p><p>No order has been placed. Please follow up.</p>`,
      bodyText: `ESCALATION: {{clientName}} ({{clientEmail}}) — {{applianceType}} was predicted empty on {{predictedEmptyDate}} ({{daysOverdue}} days ago). No order placed.`,
    },
    {
      type: "order_ack",
      subject: "Your gas order has been received",
      bodyHtml: `<p>Hi {{clientName}},</p><p>We've received your order for a <strong>{{applianceType}}</strong> cylinder. Your supplier will be in touch to confirm delivery.</p>`,
      bodyText: `Hi {{clientName}}, your order for a {{applianceType}} cylinder has been received. Your supplier will confirm delivery.`,
    },
    {
      type: "delivery_summary",
      subject: "Delivery confirmed — next cycle started",
      bodyHtml: `<p>Hi {{clientName}},</p><p>Your <strong>{{applianceType}}</strong> cylinder was delivered on <strong>{{deliveryDate}}</strong>. Your next predicted empty date is <strong>{{nextPredictedEmptyDate}}</strong>.</p><p>We'll remind you well in advance.</p>`,
      bodyText: `Hi {{clientName}}, your {{applianceType}} cylinder was delivered on {{deliveryDate}}. Next predicted empty: {{nextPredictedEmptyDate}}.`,
    },
  ];

  for (const t of templates) {
    await prisma.notificationTemplate.upsert({
      where: { type: t.type },
      update: { subject: t.subject, bodyHtml: t.bodyHtml, bodyText: t.bodyText },
      create: t,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
