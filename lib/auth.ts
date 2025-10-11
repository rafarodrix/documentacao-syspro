// Configuração do NextAuth para autenticação via OAuth com Zammad

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
        return {
          id: profile.id.toString(),
          name: `${profile.firstname} ${profile.lastname}`,
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