export type EmailMessage = {
  to: string;
  from: string;
  subject: string;
  text: string;
};

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

