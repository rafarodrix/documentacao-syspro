declare module "nodemailer" {
  type SendMailResult = { messageId?: string };

  interface Transporter {
    verify(callback: (error: unknown, success: unknown) => void): void;
    sendMail(options: {
      from?: string;
      to?: string | string[];
      subject?: string;
      text?: string;
      html?: string;
      [key: string]: unknown;
    }): Promise<SendMailResult>;
  }

  interface TransportOptions {
    service?: string;
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
      user?: string;
      pass?: string;
    };
    [key: string]: unknown;
  }

  const nodemailer: {
    createTransport(options: TransportOptions): Transporter;
  };

  export default nodemailer;
}
