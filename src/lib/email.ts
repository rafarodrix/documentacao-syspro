import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(email: string, resetLink: string, userName: string) {
  // 1. Verificação de Segurança (Debug)
  // Isso garante que o erro não seja silencioso se a Vercel não leu as variáveis
  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    console.error("❌ [EMAIL ERROR] Variáveis de ambiente GMAIL_USER ou GMAIL_PASS não definidas.");
    return { success: false, error: "Configuração de e-mail ausente no servidor." };
  }

  try {
    console.log("🚀 [EMAIL] Iniciando configuração do Transporter...");

    // 2. Configuração do Transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // 3. Teste de Conexão (Vital para Debug na Vercel)
    // Isso vai dizer se o Gmail está bloqueando o acesso ou se a senha está errada
    await new Promise((resolve, reject) => {
      transporter.verify(function (error, success) {
        if (error) {
          console.error("❌ [EMAIL] Falha na conexão SMTP:", error);
          reject(error);
        } else {
          console.log("✅ [EMAIL] Conexão SMTP pronta para enviar.");
          resolve(success);
        }
      });
    });

    console.log(`📨 [EMAIL] Enviando para: ${email}`);

    // 4. Envio do E-mail
    const info = await transporter.sendMail({
      from: `"Trilink Suporte" <${process.env.GMAIL_USER}>`, // Usar a var aqui evita spoofing
      to: email,
      subject: "Redefinição de Senha - Syspro ERP",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #333;">Olá, ${userName}</h2>
          <p style="color: #555; font-size: 16px;">
            Recebemos uma solicitação para redefinir a senha da sua conta no <strong>Syspro ERP</strong>.
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
            Se você não solicitou, ignore este e-mail.
          </p>
        </div>
      `,
    });

    console.log("✅ [EMAIL] Enviado com sucesso! ID:", info.messageId);
    return { success: true };

  } catch (error: any) {
    console.error("❌ [EMAIL CRITICAL ERROR]:", error);
    // Retornamos o erro para o Better Auth conseguir logar também
    return { success: false, error: error.message || "Erro desconhecido no envio" };
  }
}