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
            
            async profile(profile) {

                if (!profile.id || !profile.email) {
                    throw new Error("Dados essenciais (ID ou Email) não retornados pelo provedor Zammad.");
                }

                // Extrai o nome da organização, se disponível
                const organizationName: string | null = profile.organization || null;

                // Mapeia os papéis do usuário
                const userRoles = (profile.role_ids || []).map((id: number, index: number) => ({
                    id: id,
                    name: (profile.roles && profile.roles[index]) ? profile.roles[index] : 'Desconhecido',
                }));

                // Retorna o usuário no formato esperado pelo NextAuth
                return {
                    id: profile.id.toString(),
                    name: `${profile.firstname || ''} ${profile.lastname || ''}`.trim(),
                    email: profile.email,
                    image: profile.image || null,
                    roles: userRoles, 
                    organizationId: profile.organization_id || null,
                    organization: organizationName,
                };
            },
        },
    ],

    // Callbacks para incluir dados adicionais no JWT e na sessão
    callbacks: {
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
                session.user.roles = token.roles;
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