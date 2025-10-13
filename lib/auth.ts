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
          name: `${profile.firstname} ${profile.lastname}`.trim(),
          email: profile.email,
          image: profile.image || null,
          roles: profile.role_ids || [], 
          organizationId: profile.organization_id || null,
        };
      },
    },
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.roles = user.roles;
        token.organizationId = user.organizationId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = token.roles as number[]; 
        session.user.organizationId = token.organizationId as number | null;
      }
      return session;
    },
  }, 

  pages: {
    signIn: '/login',
  },
};