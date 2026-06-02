import { Resend } from "resend";
import { prisma } from "@/lib/db";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}
const FROM = "GasTag <noreply@gastag.co.za>";

type TemplateVars = Record<string, string>;

function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export async function sendNotificationEmail(
  type: string,
  to: string,
  vars: TemplateVars
): Promise<boolean> {
  const tmpl = await prisma.notificationTemplate.findUnique({ where: { type } });
  if (!tmpl) return false;

  const subject = tmpl.subject ? interpolate(tmpl.subject, vars) : "GasTag notification";
  const html = interpolate(tmpl.bodyHtml, vars);

  try {
    await getResend().emails.send({ from: FROM, to, subject, html });
    return true;
  } catch (err) {
    console.error("Email send failed", err);
    return false;
  }
}

export async function sendEscalationEmail(vars: TemplateVars): Promise<void> {
  const tmpl = await prisma.notificationTemplate.findUnique({ where: { type: "escalation" } });
  if (!tmpl) return;

  const html = interpolate(tmpl.bodyHtml, vars);
  const escalationTo = process.env.ESCALATION_EMAIL || "admin@gastag.co.za";

  await getResend().emails.send({
    from: FROM,
    to: escalationTo,
    subject: `GasTag Escalation: ${vars.clientName}`,
    html,
  });
}
