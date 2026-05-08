"use client";

import { useFormContext, useFieldArray } from "react-hook-form";
import {
  COMPANY_REMOTE_CONNECTION_TYPE_VALUES,
  COMPANY_SERVER_PROTOCOL_VALUES,
  COMPANY_SERVER_TYPE_VALUES,
  type CreateCompanyInput,
} from "@dosc-syspro/contracts/company";
import type { CompanyRemoteConnectionInput } from "@/features/company/application/company-view.types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Badge, Card, CardContent } from "@dosc-syspro/ui";
import { Server, Network, Plus, Trash2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const REMOTE_CONNECTION_LABEL: Record<CompanyRemoteConnectionInput["type"], string> = {
  DDNS_NOIP: "DDNS (NoIP)",
  RADMIN_VPN: "Radmin VPN",
};

export function CompanySettingsTab() {
  const form = useFormContext<CreateCompanyInput>();
  const toInputValue = (value: unknown) => (typeof value === "string" ? value : "");

  const remoteConnectionsFieldArray = useFieldArray({
    control: form.control,
    name: "remoteConnections",
  });

  const currentServerType = form.watch("serverType");
  const remoteConnections = form.watch("remoteConnections") ?? [];

  return (
    <div className="space-y-6">
      {/* Servidor SYSPRO */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Server className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Servidor SYSPRO</p>
            <p className="text-xs text-muted-foreground">Configuracoes de conexao com o servidor de aplicacao.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="serverType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de servidor</FormLabel>
                <Select onValueChange={field.onChange} value={toInputValue(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={COMPANY_SERVER_TYPE_VALUES[0]}>Syspro Server</SelectItem>
                    <SelectItem value={COMPANY_SERVER_TYPE_VALUES[1]}>IIS</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="installationDirectory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diretorio de instalacao</FormLabel>
                <FormControl>
                  <Input placeholder="C:\Syspro\..." {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="serverPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Porta</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={String(field.value ?? 1234)}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serverProtocol"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Protocolo</FormLabel>
                <Select onValueChange={field.onChange} value={toInputValue(field.value)}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {COMPANY_SERVER_PROTOCOL_VALUES.map((protocol) => (
                      <SelectItem key={protocol} value={protocol}>
                        {protocol}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serverHost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Servidor / Host</FormLabel>
                <FormControl>
                  <Input placeholder="localhost" {...field} value={toInputValue(field.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* IIS path ou dica padrao */}
        {currentServerType === "IIS" ? (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 text-amber-500 shrink-0" />
              <p>
                Para IIS, o campo <strong className="text-foreground">URL Path (ISAPI)</strong> deve apontar para{" "}
                <code className="font-mono text-foreground bg-muted px-1 rounded">SYSPROSERVERISAPI.DLL</code>.
              </p>
            </div>
            <FormField
              control={form.control}
              name="iisIsapiPath"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Path (ISAPI)</FormLabel>
                  <FormControl>
                    <Input placeholder="SYSPROSERVERISAPI.DLL" {...field} value={toInputValue(field.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-muted/5 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            Padrao sugerido: porta{" "}
            <code className="font-mono font-semibold text-foreground px-1">1234</code>,
            servidor{" "}
            <code className="font-mono font-semibold text-foreground px-1">localhost</code>,
            protocolo{" "}
            <code className="font-mono font-semibold text-foreground px-1">HTTP</code>.
          </div>
        )}
        </CardContent>
      </Card>

      {/* Conexoes remotas */}
      <Card className="border-border/60 bg-card shadow-sm">
        <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Conexoes remotas</p>
              <p className="text-xs text-muted-foreground">
                DDNS, Radmin VPN, IP fixo ou nome da maquina. Voce pode cadastrar mais de uma.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 shrink-0"
            onClick={() => remoteConnectionsFieldArray.append({ type: "DDNS_NOIP", details: "" })}
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar
          </Button>
        </div>

        {remoteConnections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 py-6 flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Network className="h-6 w-6 opacity-40" />
            <p className="text-xs">Nenhuma conexao remota cadastrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {remoteConnectionsFieldArray.fields.map((fieldItem, index) => (
              <div
                key={fieldItem.id}
                className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] border-border/60">
                    {REMOTE_CONNECTION_LABEL[(remoteConnections[index]?.type as CompanyRemoteConnectionInput["type"]) ?? "DDNS_NOIP"]}
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => remoteConnectionsFieldArray.remove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-3">
                  <FormField
                    control={form.control}
                    name={`remoteConnections.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo</FormLabel>
                        <Select onValueChange={field.onChange} value={toInputValue(field.value)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={COMPANY_REMOTE_CONNECTION_TYPE_VALUES[0]}>DDNS (NoIP)</SelectItem>
                            <SelectItem value={COMPANY_REMOTE_CONNECTION_TYPE_VALUES[1]}>Radmin VPN</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`remoteConnections.${index}.details`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome / IP / Identificacao</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex.: empresa.ddns.net, 26.x.x.x, nome da maquina..."
                            {...field}
                            value={toInputValue(field.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
