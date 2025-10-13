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
        return {
          id: profile.id.toString(),
          name: `${profile.firstname} ${profile.lastname}`,
          email: profile.email,
          image: profile.image || null,
        };
      },
    },
  ],
  

  // Customiza o comportamento de redirecionamento para garantir URLs seguras e corretas
  callbacks: {
    async redirect({ url, baseUrl }) {
      const finalBaseUrl = process.env.AUTH_URL || baseUrl;
        // Se a URL for relativa, concatena com a baseUrl
      if (url.startsWith('/')) {
        return `${finalBaseUrl}${url}`;
      } 
        // Se a URL tiver a mesma origem que a baseUrl, permite o redirecionamento
      else if (new URL(url).origin === finalBaseUrl) {
        return url;
      }
      return finalBaseUrl;
    },
  },

  pages: {
    signIn: '/login',
  },
};