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
  
  // ADIÇÃO 2: Bloco de Callbacks para uma depuração mais completa
  callbacks: {
    async jwt({ token, account, profile }) {
      console.log("--- CALLBACK JWT DO NEXTAUTH ---");
      console.log("TOKEN:", JSON.stringify(token, null, 2));
      console.log("ACCOUNT (DO ZAMMAD):", JSON.stringify(account, null, 2));
      console.log("PROFILE (DO ZAMMAD):", JSON.stringify(profile, null, 2));
      console.log("--------------------------------");
      return token;
    }
  },

  pages: {
    signIn: '/login',
  },
};