import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, ArrowLeft, MessagesSquare } from "lucide-react";
import { requireSession } from "@/lib/auth-helpers";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@dosc-syspro/ui";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";
import { trpc } from "@/lib/api/trpc-client";

export default async function AtendimentoPage() {
  await requireSession();
  const canAccessAtendimento = await currentUserHasPermission("atendimento:view", { acceptCompanyScope: true });

  if (!canAccessAtendimento) {
    redirect("/portal");
  }

  let chatwootUrl: string | undefined;
  let responseMode: "sso" | "fallback" | undefined;
  let responseReason: string | undefined;
  let failureMessage =
    "Nao foi possivel concluir o acesso unificado ao atendimento. Verifique a integracao do Chatwoot no portal.";

  try {
    const payload = await trpc.users.getChatwootSsoLink.query();
    if (payload?.url) {
      chatwootUrl = payload.url;
      responseMode = payload.mode === "sso" || payload.mode === "fallback"
        ? payload.mode
        : undefined;
      if ("reason" in payload) {
        responseReason = payload.reason;
      }
    }
    if (payload && "message" in payload && payload.message) {
      failureMessage = payload.message;
    }
  } catch (error) {
    failureMessage = error instanceof Error
      ? `Nao foi possivel consultar o link SSO do Chatwoot: ${error.message}`
      : "Nao foi possivel consultar o link SSO do Chatwoot.";
  }

  if (chatwootUrl && responseMode === "sso") {
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
              <div className="space-y-2">
                <p>{failureMessage}</p>
                {responseReason === "platform_app_permission" ? (
                  <p className="text-xs">
                    O acesso automatico depende de permissao do Platform App no Chatwoot para as rotas
                    {" "}<code>/platform/api/v1/users/:id</code> e <code>/platform/api/v1/users/:id/login</code>.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href="/portal">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar ao portal
                </Link>
              </Button>
              {chatwootUrl ? (
                <Button asChild>
                  <Link href={chatwootUrl} target="_blank" rel="noreferrer">
                    Abrir Chatwoot direto
                  </Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
