import nodemailer from "nodemailer";

// 1. Configuração do Transporter (Gmail)
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
});

// 2. Função para enviar o e-mail de Reset
export async function sendResetPasswordEmail(email: string, resetLink: string, userName: string) {
    try {
        const info = await transporter.sendMail({
            from: '"Trilink Suporte" <trilinksuporte@gmail.com>', // Remetente
            to: email, // Destinatário
            subject: "Redefinição de Senha - Syspro ERP", // Assunto
            // Template HTML
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #333;">Olá, ${userName}</h2>
          <p style="color: #555; font-size: 16px;">
            Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Syspro ERP</strong>.
          </p>
          <p style="color: #555; font-size: 16px;">
            Clique no botão abaixo para criar uma nova senha:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
              Redefinir Minha Senha
            </a>
          </div>
          <p style="color: #888; font-size: 14px;">
            Se o botão não funcionar, copie e cole este link no seu navegador:<br>
            <a href="${resetLink}" style="color: #2563eb;">${resetLink}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            Se você não solicitou essa alteração, ignore este e-mail. Sua senha permanecerá a mesma.
          </p>
        </div>
      `,
        });

        console.log("📧 E-mail enviado com sucesso: %s", info.messageId);
        return { success: true };
    } catch (error) {
        console.error("❌ Erro ao enviar e-mail:", error);
        return { success: false, error };
    }
}