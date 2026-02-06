import nodemailer from "nodemailer";

import type { ContactTokenPayload } from "./contactToken";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL || SMTP_USER || "no-reply@tubebenderreviews.com";
const CONTACT_TO_EMAIL =
  process.env.CONTACT_TO_EMAIL || "tbradmin@tubebenderreviews.com";

// Basic transport. If this misconfig is the issue, you'll see it in logs.
const transporter =
  SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT) || 587,
        secure: Number(SMTP_PORT) === 465,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS,
        },
      })
    : null;

function assertMailConfigured() {
  if (!transporter) {
    throw new Error(
      "SMTP not configured – set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL"
    );
  }
}

type VerificationEmailArgs = {
  to: string;
  name: string;
  subject: string;
  messageType: string;
  message: string;
  verifyUrl: string;
};

export async function sendContactVerificationEmail(
  args: VerificationEmailArgs
) {
  assertMailConfigured();

  const { to, name, subject, messageType, message, verifyUrl } = args;

  const safeName = name || "there";

  const text = [
    `Hi ${safeName},`,
    "",
    "You submitted the following message to TubeBenderReviews.com:",
    "",
    `Type: ${messageType || "General"}`,
    `Subject: ${subject}`,
    "",
    message,
    "",
    "To send this message to the site owner, please click the link below:",
    verifyUrl,
    "",
    "If you did not submit this request, you can safely ignore this email and no message will be sent.",
  ].join("\n");

  const html = `
    <p>Hi ${safeName},</p>
    <p>You submitted the following message to <strong>TubeBenderReviews.com</strong>:</p>
    <p>
      <strong>Type:</strong> ${messageType || "General"}<br />
      <strong>Subject:</strong> ${subject}
    </p>
    <pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;border:1px solid #e5e7eb;border-radius:6px;padding:10px;background:#f9fafb;">

${message.replace(/</g, "&lt;")}

    </pre>
    <p>
      To send this message to the site owner, please click the button below:

    </p>
    <p>
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 16px;border-radius:6px;background:#f97316;color:#ffffff;text-decoration:none;font-weight:600;">

        Confirm &amp; Send Message

      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">

      If you did not submit this request, you can safely ignore this email and no message will be sent.

    </p>
  `;

  await transporter!.sendMail({
    from: CONTACT_FROM_EMAIL,
    to,
    subject: `[TubeBenderReviews] Confirm your message: ${subject}`,
    text,
    html,
  });
}

export async function sendContactForwardEmail(
  payload: ContactTokenPayload
) {
  assertMailConfigured();

  const { name, email, subject, messageType, message, createdAt } = payload;

  const created = new Date(createdAt);

  const text = [
    "New verified contact submission from TubeBenderReviews.com",
    "",
    `From: ${name} <${email}>`,
    `Type: ${messageType || "General"}`,
    `Subject: ${subject}`,
    `Submitted at: ${created.toISOString()}`,
    "",
    "Message:",
    "",
    message,
  ].join("\n");

  const html = `
    <p>New verified contact submission from <strong>TubeBenderReviews.com</strong></p>
    <p>
      <strong>From:</strong> ${name} &lt;${email}&gt;<br />
      <strong>Type:</strong> ${messageType || "General"}<br />
      <strong>Subject:</strong> ${subject}<br />
      <strong>Submitted at:</strong> ${created.toISOString()}
    </p>
    <p><strong>Message:</strong></p>
    <pre style="white-space:pre-wrap;font-family:system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;border:1px solid #e5e7eb;border-radius:6px;padding:10px;background:#f9fafb;">

${message.replace(/</g, "&lt;")}

    </pre>
  `;

  await transporter!.sendMail({
    from: CONTACT_FROM_EMAIL,
    to: CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `[TubeBenderReviews] ${subject}`,
    text,
    html,
  });
}

/**
 * Backwards-compatible export:
 * Some routes import `sendContactToAdmin` (older naming).
 * The canonical implementation is `sendContactForwardEmail`.
 */
export async function sendContactToAdmin(payload: ContactTokenPayload) {
  return sendContactForwardEmail(payload);
}
