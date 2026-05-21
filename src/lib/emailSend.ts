import 'server-only';

import nodemailer from 'nodemailer';
import {
  getEmailFromAddress,
  isEmailSendingConfigured,
  isResendConfigured,
  isSmtpConfigured,
} from '@/lib/emailConfig';

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

async function sendViaResend(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: getEmailFromAddress(),
      to: [msg.to],
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    }),
  });

  return res.ok;
}

async function sendViaSmtp(msg: EmailMessage): Promise<boolean> {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return false;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  await transport.sendMail({
    from: getEmailFromAddress(),
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text ?? msg.html.replace(/<[^>]+>/g, ' '),
  });
  return true;
}

/** Resend elsőbbség, majd SMTP. Nincs konfig → false (no-op). */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!msg.to?.trim()) return false;
  if (isResendConfigured()) {
    try {
      return await sendViaResend(msg);
    } catch {
      /* fall through to SMTP */
    }
  }
  if (isSmtpConfigured()) {
    try {
      return await sendViaSmtp(msg);
    } catch {
      return false;
    }
  }
  return false;
}

export function buildNotificationEmailHtml(
  items: Array<{ title: string; body?: string | null; link?: string | null }>,
  digest: boolean,
): { subject: string; html: string; text: string } {
  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://robeo.vercel.app';
  const subject = digest
    ? `Robeo — ${items.length} új értesítés`
    : items[0]?.title || 'Robeo értesítés';

  const rows = items
    .map((item) => {
      const href = item.link
        ? item.link.startsWith('http')
          ? item.link
          : `${base.replace(/\/$/, '')}${item.link.startsWith('/') ? item.link : `/${item.link}`}`
        : base;
      const body = item.body ? `<p style="margin:4px 0 0;color:#555">${escapeHtml(item.body)}</p>` : '';
      return `<li style="margin-bottom:12px"><a href="${href}"><strong>${escapeHtml(item.title)}</strong></a>${body}</li>`;
    })
    .join('');

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#1a1a1a">
<p>Szia!</p>
${digest ? `<p>Az alábbi értesítések érkeztek:</p>` : ''}
<ul>${rows}</ul>
<p style="color:#888;font-size:12px"><a href="${base}/profile">Beállítások</a> · Robeo</p>
</body></html>`;

  const text = items
    .map((i) => `${i.title}${i.body ? ` — ${i.body}` : ''}${i.link ? ` (${i.link})` : ''}`)
    .join('\n');

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
