import { getCompaniesAction } from "../_actions/company-actions";
import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// Componentes
import { CompaniesPageHeader } from "@/components/platform/admin/empresa/CompaniesPageHeader";
import { CompanyStats } from "@/components/platform/admin/empresa/CompanyStats";
import { CompaniesToolbar } from "@/components/platform/admin/empresa/CompaniesToolbar";
import { CompaniesTable } from "@/components/platform/admin/empresa/CompaniesTable";

export default async function AdminEmpresasPage() {
  // 1. Segurança
  const session = await getProtectedSession();
  if (!session || !["ADMIN", "DEVELOPER", "SUPORTE"].includes(session.role)) {
    redirect("/admin/dashboard");
  }

  // 2. Dados
  const result = await getCompaniesAction();
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

        {/* Tabela de Dados */}
        <CompaniesTable companies={companies} />
      </section>

    </div>
  );
}