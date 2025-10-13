// src/lib/auth.ts

import { type AuthOptions } from "next-auth";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    {
      id: "zammad",
      name: "Zammad",
      type: "oauth",
      
      authorization: {
        url: `${process.env.ZAMMAD_URL}/oauth/authorize`,
        params: { scope: "" },
      },
      token: `${process.env.ZAMMAD_URL}/oauth/token`,
      userinfo: `${process.env.ZAMMAD_URL}/api/v1/users/me`,
      clientId: process.env.ZAMMAD_CLIENT_ID,
      clientSecret: process.env.ZAMMAD_CLIENT_SECRET,
      
      profile(profile) {
        // ADIÇÃO 1: Log para inspecionar os dados brutos do perfil
        console.log("--- PERFIL ZAMMAD RECEBIDO (DENTRO DA FUNÇÃO PROFILE) ---");
        console.log(JSON.stringify(profile, null, 2));
        console.log("---------------------------------------------------------");
        
        return {
          id: profile.id.toString(),
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email,
          image: profile.image || null,
        };
      },
    },
  ],
  
  // Este bloco intercepta e corrige todos os redirecionamentos do NextAuth.
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Usa a nossa AUTH_URL como a fonte da verdade, ignorando a detecção automática.
      const finalBaseUrl = process.env.AUTH_URL || baseUrl;

      // Se a URL de destino for relativa (ex: "/docs/dashboard"),
      // nós a combinamos com a nossa URL base correta.
      if (url.startsWith('/')) {
        return `${finalBaseUrl}${url}`;
      } 
      // Se a URL já for absoluta (ex: vinda do Zammad), verifica se é válida.
      else if (new URL(url).origin === finalBaseUrl) {
        return url;
      }
      
      // Como fallback de segurança, sempre retorna para a página inicial segura.
      return finalBaseUrl;
    },
  },

  pages: {
    signIn: '/login',
  },
};