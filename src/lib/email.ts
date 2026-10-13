import nodemailer from "nodemailer";

const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
});

export type Mail = { to: string; subject: string; text: string };

/** Best-effort: failures are logged and never break the action. Call only AFTER the transaction commits. */
export async function sendMails(mails: Mail[]) {
  if (process.env.DISABLE_NOTIFICATIONS === "1") return;
  await Promise.all(
    mails.map((m) =>
      transport
        .sendMail({ from: process.env.MAIL_FROM ?? "Booking App <no-reply@booking.local>", ...m })
        .catch((e) => console.error("email failed:", m.to, e.message)),
    ),
  );
}
