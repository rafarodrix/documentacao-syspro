import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, MessagesSquare } from "lucide-react";
import { requireRole } from "@/lib/auth-helpers";
import { resolveServerOrigin } from "@/lib/server-origin";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AtendimentoPage() {
  await requireRole(["ADMIN", "DEVELOPER", "SUPORTE"]);

  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie");
  const appOrigin = resolveServerOrigin(requestHeaders);
  let chatwootUrl: string | undefined;
  let failureMessage =
    "Verifique se o CHATWOOT_PLATFORM_API_TOKEN esta configurado no backend e se o Platform App tem permissao sobre a conta atual do Chatwoot.";

  try {
    const response = await fetch(`${appOrigin}/api/users/me/chatwoot/sso`, {
      method: "GET",
      headers: {
        ...(cookie ? { cookie } : {}),
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      const payload = (await response.json()) as { url?: string };
      if (payload?.url) {
        chatwootUrl = payload.url;
      }
    } else {
      const payload = await response.json().catch(() => null) as { message?: string; error?: string } | null;
      failureMessage = payload?.message ?? payload?.error ?? failureMessage;
    }
  } catch (error) {
    failureMessage = error instanceof Error
      ? `Nao foi possivel consultar o link SSO do Chatwoot: ${error.message}`
      : "Nao foi possivel consultar o link SSO do Chatwoot.";
  }

  if (chatwootUrl) {
    redirect(chatwootUrl);
  }

  return (
    <div className="flex-1 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <Card className="border-border/50 bg-card/80">
          <CardHeader className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <MessagesSquare className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Nao foi possivel abrir o Chatwoot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p>{failureMessage}</p>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/portal">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao portal
                </Link>
              </Button>
              <Button asChild>
                <Link href="https://chat.trilinksoftware.com.br" target="_blank" rel="noreferrer">
                  Abrir Chatwoot direto
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
