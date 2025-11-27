import { getCompaniesAction } from "../_actions/company-actions";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// Componentes
import { CompaniesPageHeader } from "@/components/platform/admin/empresa/CompaniesPageHeader";
import { CompanyStats } from "@/components/platform/admin/empresa/CompanyStats";
import { CompaniesToolbar } from "@/components/platform/admin/empresa/CompaniesToolbar";
import { CompaniesTable } from "@/components/platform/admin/empresa/CompaniesTable";

// Tipagem para os parâmetros de URL que o Next.js injeta automaticamente
interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function AdminEmpresasPage({ searchParams }: PageProps) {
  // 1. Segurança
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER", "SUPORTE"].includes(session.role)) {
    redirect("/admin/dashboard");
  }

  // 2. Extração dos Filtros da URL
  const search = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;

  // 3. Busca de Dados com Filtros
  const result = await getCompaniesAction({ search, status });
  const companies = (result.success && result.data) ? result.data : [];

  return (
    <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500 pb-20">

      {/* Cabeçalho */}
      <CompaniesPageHeader />

      {/* Dashboard / KPIs (Opcional: você pode querer filtrar os stats também ou mostrar sempre o total global) */}
      <section className="space-y-4">
        <CompanyStats companies={companies} />
      </section>

      {/* Toolbar e Filtros */}
      <section className="space-y-4">
        <CompaniesToolbar />

        {/* Tabela de Dados Filtrada */}
        <CompaniesTable companies={companies} />
      </section>

    </div>
  );
}