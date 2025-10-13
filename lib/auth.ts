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
                if (!profile.id || !profile.email) {
                    throw new Error("Dados essenciais (ID ou Email) não retornados pelo provedor Zammad.");
                }

                return {
                    id: profile.id.toString(),
                    name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim(),
                    email: profile.email,
                    image: profile.image || null,
                    roles: profile.role_ids || [], 
                    organizationId: profile.organization_id || null,
                };
            },
        },
    ],

    callbacks: {

        async signIn({ user, account, profile }) {
            if (user && account && profile) {
                return true; // Login permitido
            }
            return false; // Bloqueia o login se algo deu errado
        },

        async jwt({ token, user }) {
            if (user) {
                token.id = user.id; 
                token.roles = user.roles;
                token.organizationId = user.organizationId;
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
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