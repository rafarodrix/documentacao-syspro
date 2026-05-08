import { ExternalLink, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";

const TRUST_RELEASE_URL = "https://n3.cloud.trilink.com.br/form/ce8a6237-d645-45dc-b32d-15d193088cc5";

export function TrustReleaseCard() {
  return (
    <Card className="border-border/50 bg-muted/30 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between px-4 pb-1.5 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Liberar em confianca
        </CardTitle>
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/10">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <a
          href={TRUST_RELEASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-600 transition-colors hover:bg-emerald-500/20 dark:text-emerald-400"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir formulario
        </a>
        <p className="mt-2 text-xs text-muted-foreground">5 dias · 1 liberacao por vencimento.</p>
      </CardContent>
    </Card>
  );
}
