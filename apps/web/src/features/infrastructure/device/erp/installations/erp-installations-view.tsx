"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { RemoteHostDetails } from "@/features/remote/domain/remote-host.types";
import { formatDateTime } from "@/features/remote/interface/host-details/host-details.helpers";
import { requestRemoteMutation, getRemoteApiErrorMessage } from "@/features/remote/interface/remote-api";
import { SearchableCompanyPicker } from "@/features/remote/interface/host-details/components/searchable-company-picker";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@dosc-syspro/ui";
import { Building2, ChevronDown, ChevronRight, Database, HardDrive, Server } from "lucide-react";
import { useRouter } from "next/navigation";

type Installation = RemoteHostDetails["erpInstallations"][number];

type Props = {
  details: RemoteHostDetails;
  hostId: string;
};

export function ErpInstallationsView({ details, hostId }: Props) {
  const installations = details.erpInstallations;
  const [expandedId, setExpandedId] = useState<string | null>(installations[0]?.id ?? null);

  if (!installations.length) {
    return (
      <div className="rounded-xl border border-dashed border-border/50 bg-card p-6 text-center text-sm text-muted-foreground">
        Nenhuma instalação Syspro validada pelo agente neste dispositivo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Cada instalação precisa de <span className="font-medium text-foreground">diretório distinto</span>,{" "}
        <span className="font-medium text-foreground">empresa</span>,{" "}
        <span className="font-medium text-foreground">porta exclusiva</span> e runtime{" "}
        <span className="font-medium text-foreground">Syspro Server ou IIS</span> (nunca os dois).
      </p>
      {installations.map((installation) => {
        const expanded = expandedId === installation.id;
        const running = installation.serviceStatus === "running";
        return (
          <article key={installation.id} className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : installation.id)}
              className="flex w-full items-center justify-between p-5 text-left hover:bg-muted/30"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="rounded-lg bg-primary/10 p-2 text-primary">
                  <Server className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">{installation.rootPath}</span>
                    {running ? (
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-600">
                        Em execução
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {installation.version ?? "Versão sem leitura"} ·{" "}
                    {installation.discoverySources.join(", ") || "Fonte não informada"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {installation.runtimeType === "IIS"
                      ? "IIS"
                      : installation.runtimeType === "SYSPRO_SERVER"
                        ? "Syspro Server"
                        : "Runtime pendente"}{" "}
                    ·{" "}
                    {installation.configuredPort
                      ? `porta ${installation.configuredPort}`
                      : installation.requestedPort
                        ? `porta ${installation.requestedPort} em conflito`
                        : "porta não informada"}{" "}
                    · {installation.runtimeStatus}
                  </span>
                </span>
              </span>
              {expanded ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            {expanded ? (
              <div className="space-y-5 border-t border-border/50 bg-background/30 p-5">
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-3">
                  <PathDetail icon={<HardDrive className="h-3.5 w-3.5" />} label="Diretório raiz" value={installation.rootPath} />
                  <PathDetail icon={<Server className="h-3.5 w-3.5" />} label="Servidor" value={installation.serverPath} />
                  <PathDetail icon={<Server className="h-3.5 w-3.5" />} label="Executável" value={installation.executablePath} />
                  <PathDetail icon={<Database className="h-3.5 w-3.5" />} label="Dados" value={installation.dataPath} />
                  <PathDetail icon={<HardDrive className="h-3.5 w-3.5" />} label="Configuração" value={installation.configPath} />
                  <PathDetail
                    icon={<Server className="h-3.5 w-3.5" />}
                    label="Execução"
                    value={`${installation.serviceStatus ?? "Sem serviço identificado"}${installation.processPid ? ` · PID ${installation.processPid}` : ""}`}
                  />
                </div>

                <InstallationRuntimeForm
                  hostId={hostId}
                  installation={installation}
                  companyOptions={details.companyOptions}
                />

                <section className="rounded-lg border border-border/40 bg-card/50 p-4">
                  <h5 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 text-primary" /> Empresas atendidas
                  </h5>
                  {installation.companies.length ? (
                    <div className="flex flex-wrap gap-2">
                      {installation.companies
                        .filter((company) => company.active)
                        .map((company) => (
                          <span
                            key={company.id}
                            className="rounded-md border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium"
                          >
                            <b className="mr-1 text-primary">
                              {company.role === "PRIMARY" ? "Principal" : "Secundária"}
                            </b>
                            {company.name}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhuma empresa vinculada a esta instalação.</p>
                  )}
                </section>
                <p className="text-xs text-muted-foreground">
                  Última coleta: {formatDateTime(installation.lastSeenAt)}
                  {installation.lastRuntimeCheckAt
                    ? ` · Último probe: ${formatDateTime(installation.lastRuntimeCheckAt)}`
                    : ""}
                </p>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function InstallationRuntimeForm({
  hostId,
  installation,
  companyOptions,
}: {
  hostId: string;
  installation: Installation;
  companyOptions: RemoteHostDetails["companyOptions"];
}) {
  const router = useRouter();
  const primaryCompanyId =
    installation.companies.find((company) => company.active && company.role === "PRIMARY")?.companyId ??
    installation.companies.find((company) => company.active)?.companyId ??
    "";
  const [companyId, setCompanyId] = useState(primaryCompanyId || "");
  const [runtimeType, setRuntimeType] = useState<"SYSPRO_SERVER" | "IIS">(
    installation.runtimeType === "IIS" ? "IIS" : "SYSPRO_SERVER",
  );
  const [port, setPort] = useState(String(installation.configuredPort ?? installation.requestedPort ?? ""));
  const [hostName, setHostName] = useState(installation.hostName ?? "127.0.0.1");
  const [protocol, setProtocol] = useState<"HTTP" | "HTTPS" | "TCP">(
    installation.protocol === "HTTPS" || installation.protocol === "HTTP" || installation.protocol === "TCP"
      ? installation.protocol
      : runtimeType === "IIS"
        ? "HTTP"
        : "TCP",
  );
  const [iisPath, setIisPath] = useState(installation.iisApplicationPath ?? "/SYSPROSERVERISAPI.DLL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setCompanyId(primaryCompanyId || "");
    setRuntimeType(installation.runtimeType === "IIS" ? "IIS" : "SYSPRO_SERVER");
    setPort(String(installation.configuredPort ?? installation.requestedPort ?? ""));
    setHostName(installation.hostName ?? "127.0.0.1");
    setProtocol(
      installation.protocol === "HTTPS" || installation.protocol === "HTTP" || installation.protocol === "TCP"
        ? installation.protocol
        : installation.runtimeType === "IIS"
          ? "HTTP"
          : "TCP",
    );
    setIisPath(installation.iisApplicationPath ?? "/SYSPROSERVERISAPI.DLL");
  }, [installation, primaryCompanyId]);

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const configuredPort = Number(port);
      if (!Number.isInteger(configuredPort) || configuredPort < 1 || configuredPort > 65535) {
        throw new Error("Informe uma porta válida entre 1 e 65535.");
      }
      if (!companyId.trim()) {
        throw new Error("Selecione a empresa desta instalação.");
      }

      const response = await requestRemoteMutation<{ id: string }>({
        url: `/api/remote/hosts/${hostId}/installations/${installation.id}/runtime`,
        method: "PATCH",
        body: {
          companyId,
          runtimeType,
          configuredPort,
          hostName: hostName.trim() || "127.0.0.1",
          protocol: runtimeType === "IIS" ? (protocol === "TCP" ? "HTTP" : protocol) : protocol,
          iisApplicationPath: runtimeType === "IIS" ? iisPath.trim() || "/SYSPROSERVERISAPI.DLL" : null,
        },
      });

      void response;
      setMessage("Configuração salva. O host passa a usar perfil Servidor (RMM) se ainda não tinha função.");
      router.refresh();
    } catch (err) {
      setError(getRemoteApiErrorMessage(err, "Falha ao salvar a instalação."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-4 rounded-lg border border-border/40 bg-card/50 p-4">
      <div>
        <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Configuração RMM da instalação
        </h5>
        <p className="mt-1 text-xs text-muted-foreground">
          Amarrar empresa + porta + runtime permite probes locais do agente e coleta completa de servidor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label>Empresa</Label>
          <SearchableCompanyPicker
            value={companyId}
            options={companyOptions}
            onChange={setCompanyId}
            hideUnlinked
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label>Runtime (exclusivo)</Label>
          <Select
            value={runtimeType}
            onValueChange={(value) => {
              const next = value as "SYSPRO_SERVER" | "IIS";
              setRuntimeType(next);
              setProtocol(next === "IIS" ? "HTTP" : "TCP");
            }}
            disabled={saving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SYSPRO_SERVER">Syspro Server</SelectItem>
              <SelectItem value="IIS">IIS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Porta</Label>
          <Input
            inputMode="numeric"
            value={port}
            onChange={(event) => setPort(event.target.value)}
            placeholder="Ex.: 1234"
            disabled={saving}
          />
        </div>

        <div className="space-y-2">
          <Label>Host local</Label>
          <Input value={hostName} onChange={(event) => setHostName(event.target.value)} disabled={saving} />
        </div>

        <div className="space-y-2">
          <Label>Protocolo</Label>
          <Select
            value={protocol}
            onValueChange={(value) => setProtocol(value as "HTTP" | "HTTPS" | "TCP")}
            disabled={saving}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {runtimeType === "IIS" ? (
                <>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="TCP">TCP</SelectItem>
                  <SelectItem value="HTTP">HTTP</SelectItem>
                  <SelectItem value="HTTPS">HTTPS</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>

        {runtimeType === "IIS" ? (
          <div className="space-y-2 md:col-span-2">
            <Label>Caminho ISAPI / aplicação IIS</Label>
            <Input value={iisPath} onChange={(event) => setIisPath(event.target.value)} disabled={saving} />
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}

      <Button type="button" onClick={() => void onSave()} disabled={saving}>
        {saving ? "Salvando…" : "Salvar configuração da instalação"}
      </Button>
    </section>
  );
}

function PathDetail({ icon, label, value }: { icon: ReactNode; label: string; value: string | null }) {
  return (
    <div className="rounded-lg border border-border/40 bg-card/50 p-3">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </span>
      <p className="mt-1 truncate font-mono text-xs">{value ?? "Sem leitura"}</p>
    </div>
  );
}
