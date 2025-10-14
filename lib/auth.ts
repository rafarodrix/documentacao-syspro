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
            userinfo: `${process.env.ZAMMAD_URL}/api/v1/users/me?expand=true`,
            clientId: process.env.ZAMMAD_CLIENT_ID,
            clientSecret: process.env.ZAMMAD_CLIENT_SECRET,
            

            async profile(profile, tokens) {
                if (!profile.id || !profile.email) {
                    throw new Error("Dados essenciais (ID ou Email) não retornados pelo provedor Zammad.");
                }

                let organizationName: string | null = profile.organization || null;

                if (!organizationName && profile.organization_id) {
                    try {
                        const orgResponse = await fetch(`${process.env.ZAMMAD_URL}/api/v1/organizations/${profile.organization_id}`, {
                            headers: {
                                Authorization: `Bearer ${tokens.access_token}`,
                            },
                        });
                        if (orgResponse.ok) {
                            const orgData = await orgResponse.json();
                            organizationName = orgData.name || null;
                        }
                    } catch (error) {
                        console.error("Falha ao buscar nome da organização:", error);
                        organizationName = null;
                    }
                }

                return {
                    id: profile.id.toString(),
                    name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim(),
                    email: profile.email,
                    image: profile.image || null,
                    roles: profile.role_ids || [], 
                    organizationId: profile.organization_id || null,
                    organization: organizationName, // <-- DADO INCLUÍDO AQUI
                };
            },
        },
    ],

    callbacks: {
        async signIn({ user, account, profile }) {
            return true;
        },

        async jwt({ token, user }) {
            if (user) {
                token.id = user.id; 
                token.roles = user.roles;
                token.organizationId = user.organizationId;
                token.organization = user.organization; 
            }
            return token;
        },

        async session({ session, token }) {
            if (session.user && token) {
                session.user.id = token.id as string;
                session.user.roles = token.roles; // <-- Correção: sem 'as number[]'
                session.user.organizationId = token.organizationId as number | null;
                session.user.organization = token.organization as string | null;
            }
            return session;
        },
    }, 

    pages: {
        signIn: '/login',
    },
};