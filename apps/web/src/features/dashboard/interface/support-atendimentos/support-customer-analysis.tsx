"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { Building2, FolderKanban, Tag, Users } from "lucide-react";

type RecurrenceItem = {
  key: string;
  name: string;
  count: number;
  channel: "WHATSAPP" | "EMAIL" | "PORTAL" | "PHONE";
  motive?: string | null;
  lastAttendance?: string | null;
};

type SupportCustomerAnalysisProps = {
  topCompanies: RecurrenceItem[];
  topContacts: RecurrenceItem[];
  categories: Array<{ name: string; count: number }>;
  topTags: Array<{ name: string; count: number }>;
};

export function SupportCustomerAnalysis({
  topCompanies,
  topContacts,
  categories,
  topTags,
}: SupportCustomerAnalysisProps) {
  const [activeTab, setActiveTab] = useState("companies");

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Análise de Clientes, Categorias & Recorrências
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Detalhamento por clientes solicitantes, categorias de produtos e motivos frequentes.
          </p>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-4 max-w-md h-9 text-xs">
            <TabsTrigger value="companies" className="flex items-center gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Empresas
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-1.5 text-xs">
              <Users className="h-3.5 w-3.5" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center gap-1.5 text-xs">
              <FolderKanban className="h-3.5 w-3.5" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="tags" className="flex items-center gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies" className="m-0">
            {topCompanies.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Sem empresas registradas no período.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg border-border/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Empresa</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Atendimentos</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Canal Principal</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Último Atendimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {topCompanies.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-foreground">{item.name}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground tabular-nums">{item.count}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">{item.channel}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{item.lastAttendance ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="contacts" className="m-0">
            {topContacts.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Sem contatos registrados no período.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg border-border/50">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-2.5 font-semibold">Contato</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Atendimentos</th>
                      <th className="px-4 py-2.5 text-center font-semibold">Canal Principal</th>
                      <th className="px-4 py-2.5 text-right font-semibold">Último Atendimento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {topContacts.map((item) => (
                      <tr key={item.key} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-foreground">{item.name}</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground tabular-nums">{item.count}</td>
                        <td className="px-4 py-2.5 text-center text-muted-foreground">{item.channel}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{item.lastAttendance ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="categories" className="m-0">
            {categories.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Sem categorias registradas no período.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                {categories.map((cat) => (
                  <div key={cat.name} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3 text-xs">
                    <span className="font-medium text-foreground truncate">{cat.name}</span>
                    <span className="font-mono font-bold text-primary tabular-nums">{cat.count}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tags" className="m-0">
            {topTags.length === 0 ? (
              <p className="p-4 text-xs text-muted-foreground">Sem tags registradas no período.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {topTags.map((tag) => (
                  <div key={tag.name} className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs">
                    <span className="text-muted-foreground">#{tag.name}</span>
                    <span className="font-bold text-foreground tabular-nums">{tag.count}</span>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
