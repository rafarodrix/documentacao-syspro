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
        // Log de depuração que podemos remover depois que tudo funcionar
        console.log("Perfil recebido do Zammad:", JSON.stringify(profile, null, 2));

        return {
          id: profile.id.toString(),
          name: `${profile.firstname} ${profile.lastname}`.trim(),
          email: profile.email,
          image: profile.image || null,
        };
      },
    },
  ],
  pages: {
    signIn: '/login',
  },
};