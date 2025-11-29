import { getCompaniesAction } from "../../../../actions/admin/company-actions";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// Componentes
import { CompaniesPageHeader } from "@/components/platform/admin/empresa/CompaniesPageHeader";
import { CompanyStats } from "@/components/platform/admin/empresa/CompanyStats";
import { CompaniesToolbar } from "@/components/platform/admin/empresa/CompaniesToolbar";
import { CompaniesTable } from "@/components/platform/admin/empresa/CompaniesTable";

// 1. ATUALIZAÇÃO: searchParams agora é uma Promise
interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminEmpresasPage(props: PageProps) {
  // 2. ATUALIZAÇÃO: Aguardar a resolução da Promise
  const searchParams = await props.searchParams;

  // 3. Segurança
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER", "SUPORTE"].includes(session.role)) {
    redirect("/admin/dashboard");
  }

  // 4. Extração dos Filtros (agora usando a variável resolvida)
  const search = typeof searchParams.q === 'string' ? searchParams.q : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;

  // 5. Busca de Dados com Filtros
  const result = await getCompaniesAction({ search, status });
  const companies = (result.success && result.data) ? result.data : [];

  return (
    <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in duration-500 pb-20">

      {/* Cabeçalho */}
      <CompaniesPageHeader />

      {/* Dashboard / KPIs */}
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