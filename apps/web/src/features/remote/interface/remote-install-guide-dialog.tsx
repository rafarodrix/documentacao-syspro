"use client";

import { useState } from "react";
import { Copy, HardDriveDownload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type RemoteInstallGuideDialogProps = {
  moduleSettings: {
    rustDeskServerHost: string;
    rustDeskServerConfig: string;
    rustDeskPublicKey: string;
    rustDeskVersion: string;
    defaultPassword: string;
  };
  scriptUrl: string;
  scriptFilename: string;
  title?: string;
  description?: string;
  triggerClassName?: string;
};

async function copyTextWithFallback(value: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {}
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "-9999px";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("copy_failed");
  }
}

function buildScriptSlug(filename: string) {
  const normalized = filename.trim();
  if (normalized) return normalized;
  return "trilink-remote-agent.ps1";
}

export function RemoteInstallGuideDialog({
  moduleSettings,
  scriptUrl,
  scriptFilename,
  title = "Configuracao e instalacao",
  description = "Campos prontos para preencher manualmente no RustDesk e comandos de shell para instalar o agente com privilegio de administrador.",
  triggerClassName,
}: RemoteInstallGuideDialogProps) {
  const [open, setOpen] = useState(false);
  const rustDeskServerHost = moduleSettings.rustDeskServerHost || "acesso.trilinksoftware.com.br";
  const rustDeskPublicKey =
    moduleSettings.rustDeskPublicKey || "6FpnQH+KbbpX0qw6XxF0xqnIO0QnHImwbvQ5Lv7q6gU=";
  const rustDeskServerConfig =
    moduleSettings.rustDeskServerConfig ||
    "==Qfi0TVnZTc3YHT1EldidXbJhkbRBzTJ5Wc4BjR4hlN3FHMYBnYit0KIFlbwZkNiojI5V2aiwiIiojIpBXYiwiIyJmLt92YuUmchdHdm92cr5Waslmc05ybzNXZjFmI6ISehxWZyJCLiInYu02bj5SZyF2d0Z2bztmbpxWayRnLvN3clNWYiojI0N3boJye";
  const normalizedFilename = buildScriptSlug(scriptFilename);
  const adminShellCommand = `powershell.exe -ExecutionPolicy Bypass -File ".\\${normalizedFilename}"`;
  const unblockAndRunCommand = `Unblock-File ".\\${normalizedFilename}"\npowershell.exe -ExecutionPolicy Bypass -File ".\\${normalizedFilename}"`;

  async function handleCopy(value: string, label: string) {
    try {
      await copyTextWithFallback(value);
      toast.success(`${label} copiado.`);
    } catch {
      toast.error(`Falha ao copiar ${label.toLowerCase()}.`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName ?? "gap-2"}>
          <HardDriveDownload className="h-4 w-4" />
          Configuracao e instalacao
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-1rem)] max-w-3xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-xl border border-border/50 bg-muted/15 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-medium text-foreground">Servidor ID/Relay</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={() =>
                  handleCopy(
                    `${rustDeskServerHost}\n${rustDeskServerHost}\n${rustDeskServerHost}\n${rustDeskPublicKey}`,
                    "Dados manuais do servidor"
                  )
                }
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copiar bloco
              </Button>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)] sm:items-center">
              <p className="text-sm text-foreground">Servidor de ID</p>
              <div className="break-all rounded-md border border-border bg-background px-3 py-2 font-medium text-foreground">{rustDeskServerHost}</div>
              <p className="text-sm text-foreground">Servidor de Relay</p>
              <div className="break-all rounded-md border border-border bg-background px-3 py-2 font-medium text-foreground">{rustDeskServerHost}</div>
              <p className="text-sm text-foreground">Servidor da API</p>
              <div className="break-all rounded-md border border-border bg-background px-3 py-2 font-medium text-foreground">{rustDeskServerHost}</div>
              <p className="text-sm text-foreground">Key</p>
              <div className="rounded-md border border-border bg-background px-3 py-2 break-all font-mono text-xs text-foreground">{rustDeskPublicKey}</div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <p className="text-[11px] uppercase tracking-wide">Versao alvo</p>
              <p className="mt-1 text-foreground">{moduleSettings.rustDeskVersion}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
              <p className="text-[11px] uppercase tracking-wide">Senha padrao</p>
              <p className="mt-1 text-foreground">{moduleSettings.defaultPassword}</p>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[11px] uppercase tracking-wide">Config exportada do servidor</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={() => handleCopy(rustDeskServerConfig, "Config exportada do servidor")}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copiar config
              </Button>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-foreground">{rustDeskServerConfig}</p>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
            <p className="text-[11px] uppercase tracking-wide">Comando base no PowerShell como administrador</p>
            <p className="mt-1 break-all font-mono text-xs text-foreground">{adminShellCommand}</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={() => handleCopy(adminShellCommand, "Comando de instalacao")}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copiar comando
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={() => handleCopy(scriptUrl, "URL do script")}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copiar URL do script
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
            <p className="text-[11px] uppercase tracking-wide">Shell se o arquivo vier bloqueado</p>
            <p className="mt-1 whitespace-pre-wrap break-all font-mono text-xs text-foreground">{unblockAndRunCommand}</p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2 sm:w-auto"
                onClick={() => handleCopy(unblockAndRunCommand, "Comando com Unblock-File")}
              >
                <Copy className="mr-2 h-3.5 w-3.5" />
                Copiar shell completo
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-muted/15 p-3">
            <p className="font-medium text-foreground">Passo a passo</p>
            <p className="mt-2">1. Baixe o `.ps1` pela plataforma.</p>
            <p>2. Abra o PowerShell como administrador.</p>
            <p>3. Se o Windows bloquear o arquivo, rode primeiro o shell com `Unblock-File`.</p>
            <p>4. Se precisar configurar manualmente o app, preencha `Servidor de ID`, `Relay`, `API` e `Key` com os dados acima.</p>
            <p>5. Se o cliente pedir, cole tambem a `config exportada` no fluxo do servidor proprio.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
