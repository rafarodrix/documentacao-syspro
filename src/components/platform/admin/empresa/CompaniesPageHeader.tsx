import { CompanySheet } from "@/components/platform/admin/empresa/CompanySheet";

export function CompaniesPageHeader() {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-border/40 pb-6">
            <div className="space-y-1.5">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    Empresas
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Gerencie organizações, clientes e dados fiscais.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <CompanySheet />
            </div>
        </div>
    );
}