import { Suspense } from "react";
import { BookOpen, CalendarDays, Files, Info, Scale, Search } from "lucide-react";
import { TaxAnexosContainer, TaxNcmLookup, TaxViewerContainer } from "@/features/tax/interface";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TaxReformWorkspace() {
  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-6 p-1 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Scale className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Reforma Tributaria (IBS/CBS)</h1>
            <p className="text-lg text-muted-foreground">
              Consulta oficial de CSTs, classificacoes fiscais e anexos para o novo modelo tributario.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      <Alert className="border-blue-200 bg-blue-50/50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-200">
        <Info className="h-4 w-4" />
        <AlertTitle className="font-semibold">Base de dados sincronizada</AlertTitle>
        <AlertDescription className="mt-1 text-sm">
          Estes dados sao importados da base oficial da SEFAZ. Se nao encontrar um item, solicite uma nova sincronizacao ao administrador.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="rules" className="space-y-4">
        <TabsList className="h-auto flex-wrap bg-muted/50 p-1">
          <TabsTrigger value="rules" className="gap-2 px-4 py-2">
            <BookOpen className="h-4 w-4" />
            Regras vigentes
          </TabsTrigger>
          <TabsTrigger value="annexes" className="gap-2 px-4 py-2">
            <Files className="h-4 w-4" />
            Anexos
          </TabsTrigger>
          <TabsTrigger value="ncm" className="gap-2 px-4 py-2">
            <Search className="h-4 w-4" />
            Consulta por NCM
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Regras vigentes
            </h2>
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>Vigencia: 2026+</span>
            </div>
          </div>

          <div className="mt-2">
            <Suspense fallback={<TaxViewerSkeleton />}>
              <TaxViewerContainer />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="annexes" className="space-y-4">
          <div className="mt-2">
            <Suspense fallback={<TaxViewerSkeleton />}>
              <TaxAnexosContainer />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="ncm" className="space-y-4">
          <TaxNcmLookup />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TaxViewerSkeleton() {
  return (
    <div className="h-150 w-full space-y-4 rounded-md border bg-card p-4">
      <div className="h-10 w-full animate-pulse rounded-md bg-muted/40" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 w-full animate-pulse rounded-md bg-muted/20" />
        ))}
      </div>
    </div>
  );
}
