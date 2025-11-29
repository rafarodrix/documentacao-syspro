import { Metadata } from "next";
import { TeamManagement } from "@/components/platform/client/teams";
import { Company } from "@/components/platform/client/teams/types";

export const metadata: Metadata = {
    title: "Gestão de Equipes | SysPro",
    description: "Gerencie permissões e membros das suas empresas.",
};

// --- SIMULAÇÃO DE BANCO DE DADOS ---
// No futuro, substitua isso pela chamada ao seu Prisma/API
async function getUserCompanies(): Promise<Company[]> {
    // Simula um delay de rede de 1 segundo para testar o loading
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return [
        {
            id: "comp_123",
            name: "Tech Solutions Ltda",
            cnpj: "12.345.678/0001-90",
            plan: "Enterprise",
            currentUserRole: "admin", // Nesta empresa, sou ADMIN
            users: [
                {
                    id: "u1",
                    name: "Rafael Rodrigues",
                    email: "rafael@tech.com",
                    role: "admin",
                    status: "active",
                    joinedAt: "2023-01-10",
                    avatarUrl: "https://github.com/shadcn.png"
                },
                {
                    id: "u2",
                    name: "Ana Souza",
                    email: "ana.souza@tech.com",
                    role: "member",
                    status: "active",
                    joinedAt: "2023-05-15"
                },
                {
                    id: "u3",
                    name: "Marcos Dev",
                    email: "marcos@tech.com",
                    role: "viewer",
                    status: "invited",
                    joinedAt: "2024-02-20"
                },
            ],
        },
        {
            id: "comp_456",
            name: "Consultoria ABC",
            cnpj: "98.765.432/0001-10",
            plan: "Basic",
            currentUserRole: "member", // Nesta empresa, sou MEMBRO (sem poder de adicionar)
            users: [
                {
                    id: "u10",
                    name: "Roberto Chefe",
                    email: "roberto@abc.com",
                    role: "admin",
                    status: "active",
                    joinedAt: "2022-11-01"
                },
                {
                    id: "u1",
                    name: "Rafael Rodrigues",
                    email: "rafael@tech.com",
                    role: "member",
                    status: "active",
                    joinedAt: "2023-02-10",
                    avatarUrl: "https://github.com/shadcn.png"
                },
            ],
        },
    ];
}

export default async function GestaoEquipesPage() {
    // 1. Busca os dados no servidor (Server-side fetching)
    const companies = await getUserCompanies();

    return (
        <div className="container mx-auto py-10 max-w-6xl px-4 md:px-6" >
            {/* 2. Renderiza o componente Cliente com os dados iniciais */}
            < TeamManagement companies={companies} />
        </div>
    );
}