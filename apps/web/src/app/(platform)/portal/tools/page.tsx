import Link from "next/link";
import { Scale, Wrench } from "lucide-react";
import { ToolsHub } from "@/components/platform/tools/tools-hub";
import { TaxReformWorkspace } from "@/features/tax/interface";
import { cn } from "@/lib/utils";

type ToolsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return String(value[0] ?? "").trim();
  return String(value ?? "").trim();
}

export default async function AdminToolsPage({ searchParams }: ToolsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const activeTab = readParam(params?.tab) === "reforma" ? "reforma" : "tools";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ferramentas</h1>
        <p className="text-muted-foreground">Utilitarios e consultas operacionais para o portal.</p>
      </div>

      <div className="inline-flex w-full flex-wrap gap-2 rounded-xl border border-border/40 bg-muted/40 p-1 sm:w-auto">
        <Link
          href="/portal/tools"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "tools"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
          )}
        >
          <Wrench className="h-4 w-4" />
          Hub de ferramentas
        </Link>
        <Link
          href="/portal/tools?tab=reforma"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "reforma"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
          )}
        >
          <Scale className="h-4 w-4" />
          Reforma Tributaria
        </Link>
      </div>

      {activeTab === "reforma" ? <TaxReformWorkspace /> : <ToolsHub basePath="/portal/tools" />}
    </div>
  );
}
