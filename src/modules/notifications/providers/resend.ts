import { AppError } from "@/lib/errors/app-error";
import type { EmailMessage, EmailProvider } from "@/modules/notifications/email.provider";

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey?: string) {}

  async send(message: EmailMessage): Promise<void> {
    if (!this.apiKey) {
      throw new AppError("INTERNAL_ERROR", 500, "RESEND_API_KEY is not configured.");
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? `<p>${escapeHtml(message.text)}</p>`,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const raw = await response.text().catch(() => "");
      throw new AppError(
        "BAD_REQUEST",
        400,
        `Resend send failed (${response.status}): ${raw.slice(0, 240) || "Unknown error"}`,
      );
    }
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("\n", "<br/>");
}
