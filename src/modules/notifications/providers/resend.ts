import { AppError } from "@/lib/errors/app-error";
import type { EmailMessage, EmailProvider } from "@/modules/notifications/email.provider";

export class ResendEmailProvider implements EmailProvider {
  constructor(private readonly apiKey?: string) {}

  async send(message: EmailMessage): Promise<void> {
    void message;
    if (!this.apiKey) {
      throw new AppError("INTERNAL_ERROR", 500, "RESEND_API_KEY is not configured.");
    }

    // TODO(sprint-9): Integrate real Resend SDK/API call when provider is enabled in production.
    throw new AppError("INTERNAL_ERROR", 500, "Resend provider integration is not implemented yet.");
  }
}
