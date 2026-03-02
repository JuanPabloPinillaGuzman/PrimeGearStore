import { logger } from "@/lib/logger";
import type { EmailMessage, EmailProvider } from "@/modules/notifications/email.provider";

export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    logger.info(
      {
        to: message.to,
        from: message.from,
        subject: message.subject,
        body: message.text,
        html: message.html,
      },
      "Console email provider sent message.",
    );
  }
}
