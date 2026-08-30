import "server-only";
import nodemailer from "nodemailer";
import type { Locale } from "@/lib/i18n/locales";

type MailPayload = { to: string; subject: string; html: string };

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
  return transporter;
}

export async function sendMail(payload: MailPayload): Promise<{ sent: boolean; mode: "smtp" | "console" }> {
  const t = getTransporter();
  const fromName = process.env.SMTP_FROM_NAME || "SHEROKEY";
  const fromEmail = process.env.SMTP_FROM_EMAIL || "no-reply@sherokey.com";

  if (!t) {
    // Console mode: no SMTP configured. Log so the flow is still observable/testable end to end.
    console.log(`[email:console-mode] To: ${payload.to} | Subject: ${payload.subject}`);
    return { sent: false, mode: "console" };
  }

  await t.sendMail({ from: `"${fromName}" <${fromEmail}>`, to: payload.to, subject: payload.subject, html: payload.html });
  return { sent: true, mode: "smtp" };
}

const strings: Record<Locale, Record<string, string>> = {
  en: {
    welcomeSubject: "Welcome to SHEROKEY",
    welcomeBody: "Thanks for creating your SHEROKEY account. Start exploring digital products, licenses and subscriptions.",
    orderPaidSubject: "Payment confirmed — Order",
    orderPaidBody: "Your payment was successful. Your digital products are ready in your SHEROKEY account.",
    resetSubject: "Reset your SHEROKEY password",
    resetBody: "We received a request to reset your password. Use the code below or link to continue.",
  },
  ar: {
    welcomeSubject: "مرحبًا بك في شيروكي",
    welcomeBody: "شكرًا لإنشائك حساب في شيروكي. ابدأ باستكشاف المنتجات الرقمية والتراخيص والاشتراكات.",
    orderPaidSubject: "تم تأكيد الدفع — الطلب",
    orderPaidBody: "تم الدفع بنجاح. منتجاتك الرقمية جاهزة الآن في حسابك على شيروكي.",
    resetSubject: "إعادة تعيين كلمة المرور في شيروكي",
    resetBody: "تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بك. استخدم الرابط أدناه للمتابعة.",
  },
  ru: {
    welcomeSubject: "Добро пожаловать в SHEROKEY",
    welcomeBody: "Спасибо за регистрацию в SHEROKEY. Начните изучать цифровые товары, лицензии и подписки.",
    orderPaidSubject: "Оплата подтверждена — Заказ",
    orderPaidBody: "Оплата прошла успешно. Ваши цифровые товары уже доступны в аккаунте SHEROKEY.",
    resetSubject: "Сброс пароля SHEROKEY",
    resetBody: "Мы получили запрос на сброс пароля. Перейдите по ссылке ниже, чтобы продолжить.",
  },
};

function wrap(title: string, body: string, footer = "SHEROKEY") {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;background:#0b0f19;padding:32px;color:#e2e8f0">
  <div style="max-width:520px;margin:0 auto;background:#111827;border-radius:16px;padding:32px;border:1px solid #1f2937">
    <h1 style="color:#818cf8;font-size:22px;margin:0 0 16px">${title}</h1>
    <p style="line-height:1.6;color:#cbd5e1">${body}</p>
    <p style="margin-top:32px;font-size:12px;color:#64748b">${footer}</p>
  </div></body></html>`;
}

export async function sendWelcomeEmail(to: string, locale: Locale) {
  const s = strings[locale] ?? strings.en;
  return sendMail({ to, subject: s.welcomeSubject, html: wrap(s.welcomeSubject, s.welcomeBody) });
}

export async function sendPasswordResetEmail(to: string, locale: Locale, resetUrl: string) {
  const s = strings[locale] ?? strings.en;
  return sendMail({ to, subject: s.resetSubject, html: wrap(s.resetSubject, `${s.resetBody}<br/><br/><a href="${resetUrl}" style="color:#818cf8">${resetUrl}</a>`) });
}

export async function sendOrderPaidEmail(to: string, locale: Locale, orderNumber: string) {
  const s = strings[locale] ?? strings.en;
  return sendMail({ to, subject: `${s.orderPaidSubject} #${orderNumber}`, html: wrap(s.orderPaidSubject, `${s.orderPaidBody} — #${orderNumber}`) });
}
