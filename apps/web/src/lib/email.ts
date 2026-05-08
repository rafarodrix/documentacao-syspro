import nodemailer from "nodemailer";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Erro desconhecido no envio";
}

export async function sendResetPasswordEmail(email: string, resetLink: string, userName: string) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error("Configuracao de e-mail ausente: GMAIL_USER ou GMAIL_PASS nao definidos.");
    return { success: false, error: "Configuracao de e-mail ausente no servidor." };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await new Promise((resolve, reject) => {
      transporter.verify((error, success) => {
        if (error) {
          console.error("Falha na conexao SMTP:", error);
          reject(error);
          return;
        }

        resolve(success);
      });
    });

    const info = await transporter.sendMail({
      from: `"Trilink Suporte" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Redefinicao de Senha - Syspro ERP",
      // eslint-disable-next-line trilink-tokens/no-hex-colors
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #333;">Ola, ${userName}</h2>
          <p style="color: #555; font-size: 16px;">
            Recebemos uma solicitacao para redefinir a senha da sua conta no <strong>Syspro ERP</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="color: #888; font-size: 14px;">
            Link direto: <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Se voce nao solicitou, ignore este e-mail.
          </p>
        </div>
      `,
    });

    console.log("Email enviado com sucesso. ID:", info.messageId);
    return { success: true };
  } catch (error: unknown) {
    console.error("Falha critica ao enviar e-mail:", error);
    return { success: false, error: getErrorMessage(error) };
  }
}
