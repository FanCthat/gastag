import { Resend } from "resend";
import { prisma } from "@/lib/db";

function getResend() { return new Resend(process.env.RESEND_API_KEY!); }
const FROM = "GasTag <noreply@mobwatch.co.za>";

type TemplateVars = Record<string, string>;

function interpolate(template: string, vars: TemplateVars): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// Returns the guarded recipient, or null if the email should be suppressed.
// In production (VERCEL_ENV=production) the original address is returned unchanged.
// Everywhere else, returns GUARD_EMAIL if set, or null (suppressed with a warning).
export function guardEmail(to: string): string | null {
  if (process.env.VERCEL_ENV === "production") return to;
  const guard = process.env.GUARD_EMAIL;
  if (!guard) {
    console.warn(`[EMAIL GUARD] Suppressed email to ${to} — GUARD_EMAIL not set in non-production`);
    return null;
  }
  return guard;
}

// The single choke point for all outgoing email in this codebase.
// Never call emails.send() directly anywhere else — all sends go through here
// so the environment guard and subject prefixing apply consistently.
export async function sendEmail({
  to,
  subject,
  html,
  from = FROM,
  cc,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  cc?: string;
  attachments?: Array<{ filename: string; content: Buffer }>;
}): Promise<void> {
  const guardedTo = guardEmail(to);
  if (guardedTo === null) return;

  const isGuarded = guardedTo !== to;
  const guardedSubject = isGuarded ? `[GUARD → ${to}] ${subject}` : subject;

  const { error } = await getResend().emails.send({
    from,
    to: guardedTo,
    subject: guardedSubject,
    html,
    // Drop CC when guarded — the guard address receives everything.
    ...(cc && !isGuarded ? { cc } : {}),
    ...(attachments ? { attachments } : {}),
  });
  if (error) {
    throw new Error(`Resend error: ${error.message ?? JSON.stringify(error)}`);
  }
}

export async function sendNotificationEmail(
  type: string,
  to: string,
  vars: TemplateVars,
  prependHtml?: string
): Promise<boolean> {
  const tmpl = await prisma.notificationTemplate.findUnique({ where: { type } });
  if (!tmpl) return false;

  const subject = tmpl.subject ? interpolate(tmpl.subject, vars) : "GasTag notification";
  const body = interpolate(tmpl.bodyHtml, vars);
  const html = prependHtml ? prependHtml + body : body;

  try {
    await sendEmail({ to, subject, html });
    return true;
  } catch (err) {
    console.error("Email send failed", err);
    return false;
  }
}

export async function sendEscalationEmail(vars: TemplateVars, vendorEmail: string): Promise<void> {
  const tmpl = await prisma.notificationTemplate.findUnique({ where: { type: "escalation" } });
  if (!tmpl) return;

  const html = interpolate(tmpl.bodyHtml, vars);

  await sendEmail({
    to: vendorEmail,
    subject: `GasTag: ${vars.clientName} hasn't reordered — cylinder overdue`,
    html,
  });
}
