import { Suspense } from "react";
import { BookOpen, CalendarDays, Files, Search } from "lucide-react";
import { TaxAnexosContainer, TaxNcmLookup, TaxViewerContainer } from "@/features/tax/interface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TaxReformWorkspace() {
  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-6 animate-in fade-in duration-500">
      <Tabs defaultValue="rules" className="w-full space-y-6">
        <div className="flex flex-col items-start justify-between gap-4">
          <TabsList className="grid h-auto w-full grid-cols-1 p-1 sm:w-auto sm:grid-cols-3">
            <TabsTrigger value="rules" className="gap-2 py-2">
            <BookOpen className="h-4 w-4" />
            Regras vigentes
          </TabsTrigger>
            <TabsTrigger value="annexes" className="gap-2 py-2">
            <Files className="h-4 w-4" />
            Anexos
          </TabsTrigger>
            <TabsTrigger value="ncm" className="gap-2 py-2">
            <Search className="h-4 w-4" />
            Consulta por NCM
          </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="rules" className="mt-0 space-y-4">
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

        <TabsContent value="annexes" className="mt-0 space-y-4">
          <div className="mt-2">
            <Suspense fallback={<TaxViewerSkeleton />}>
              <TaxAnexosContainer />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="ncm" className="mt-0 space-y-4">
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
