import { Metadata } from "next";
import { TeamManagement } from "@/components/platform/client/teams";
import { Company } from "@/components/platform/client/teams/types";

export const metadata: Metadata = {
    title: "Gestão de Equipes | SysPro",
    description: "Gerencie usuários e permissões das suas empresas.",
};

// --- MOCK DATA (Substituir pelo seu use-case) ---
async function getMyCompanies(): Promise<Company[]> {
    // Simula delay de banco de dados
    await new Promise(resolve => setTimeout(resolve, 500));

    return [
        {
            id: "comp_1",
            name: "Tech Solutions Ltda",
            cnpj: "12.345.678/0001-90",
            plan: "Enterprise",
            currentUserRole: "admin", // Aqui o usuário logado é ADMIN
            users: [
                { id: "u1", name: "Rafael Rodrigues", email: "rafael@tech.com", role: "admin", status: "active", joinedAt: "2023-01-01" },
                { id: "u2", name: "Ana Souza", email: "ana@tech.com", role: "member", status: "active", joinedAt: "2023-05-10" },
                { id: "u3", name: "Carlos Dev", email: "carlos@tech.com", role: "viewer", status: "invited", joinedAt: "2024-02-20" },
            ]
        },
        {
            id: "comp_2",
            name: "Consultoria ABC",
            cnpj: "98.765.432/0001-10",
            plan: "Basic",
            currentUserRole: "member", // Aqui o usuário logado é MEMBRO (não pode adicionar)
            users: [
                { id: "u4", name: "Roberto Chefe", email: "roberto@abc.com", role: "admin", status: "active", joinedAt: "2022-10-01" },
                { id: "u1", name: "Rafael Rodrigues", email: "rafael@tech.com", role: "member", status: "active", joinedAt: "2023-03-15" },
            ]
        }
    ];
}

export default async function GestaoEquipesPage() {
    const companies = await getMyCompanies();

    return (
        <div className="container mx-auto py-10 max-w-6xl">
            <TeamManagement companies={companies} />
        </div>
    );
}