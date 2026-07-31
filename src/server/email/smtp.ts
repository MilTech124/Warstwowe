import nodemailer, { type Transporter } from "nodemailer";

export type TransactionalEmail = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

let transporter: Transporter | null = null;

function getSmtpPort() {
  const port = Number(process.env.SMTP_PORT || 465);
  return Number.isInteger(port) && port > 0 ? port : 465;
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST
      && process.env.SMTP_USER
      && process.env.SMTP_PASSWORD
      && process.env.MAIL_FROM,
  );
}

function getTransporter() {
  if (transporter) return transporter;

  const port = getSmtpPort();
  const secure = process.env.SMTP_SECURE
    ? process.env.SMTP_SECURE === "true"
    : port === 465;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

export async function sendTransactionalEmail(message: TransactionalEmail) {
  if (!isSmtpConfigured()) return { sent: false as const, reason: "SMTP_NOT_CONFIGURED" as const };

  const info = await getTransporter().sendMail({
    from: process.env.MAIL_FROM,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo || process.env.MAIL_REPLY_TO || undefined,
  });

  return { sent: true as const, messageId: info.messageId };
}
