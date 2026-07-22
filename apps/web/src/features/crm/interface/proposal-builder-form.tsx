"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, Calendar, CircleDollarSign, FileText, Mail, Phone, Plus, Save, ShieldAlert, Trash2, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/api/trpc-client";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Separator, Checkbox, Badge } from "@dosc-syspro/ui";
import { PageHeader } from "@/components/patterns";
import { cn } from "@/lib/utils";
import { crmLeadSchema, type CrmLead, type CrmProposal } from "@dosc-syspro/contracts/crm";

type Props = {
  leadId: string;
};

type RoutineOption = {
  id: string;
  name: string;
  price: number;
  includedInBase: boolean;
};

const STANDARD_ROUTINES: RoutineOption[] = [
  { id: "sped", name: "Escrituração SPED Fiscal", price: 0, includedInBase: true },
  { id: "gia", name: "Entrega de GIA Estadual", price: 0, includedInBase: true },
  { id: "dctf", name: "DCTF Federal Mensal", price: 50, includedInBase: false },
  { id: "efd", name: "EFD Contribuições PIS/COFINS", price: 50, includedInBase: false },
  { id: "retro", name: "Reconciliação Retroativa de Notas", price: 150, includedInBase: false },
];

export function ProposalBuilderForm({ leadId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [lead, setLead] = useState<CrmLead | null>(null);
  const [existingProposal, setExistingProposal] = useState<CrmProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // State Variables
  const [planoFiscal, setPlanoFiscal] = useState<"standard" | "professional" | "enterprise">("standard");
  const [suporteNivel, setSuporteNivel] = useState<"basico" | "avancado" | "premium">("basico");
  const [hostsCount, setHostsCount] = useState<number>(0);
  const [selectedRoutines, setSelectedRoutines] = useState<string[]>(["sped", "gia"]);
  
  const [setupValue, setSetupValue] = useState<number>(500);
  const [overrideMRR, setOverrideMRR] = useState<string>("");
  const [vigencia, setVigencia] = useState<string>("12");
  const [reajuste, setReajuste] = useState<string>("IPCA");
  const [validUntil, setValidUntil] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    let isCurrent = true;

    async function loadProposalContext() {
      setIsLoading(true);
      try {
        const [leadResponse, proposalResponse] = await Promise.all([
          trpc.crm.getById.query({ id: leadId }),
          trpc.crm.getProposalByLeadId.query({ leadId }),
        ]);
        if (!isCurrent) return;

        setLead(leadResponse.success && leadResponse.data ? crmLeadSchema.parse(leadResponse.data) : null);
        setExistingProposal(proposalResponse?.success ? proposalResponse.data ?? null : null);
      } catch (error) {
        console.error(error);
        if (isCurrent) {
          toast.error("Nao foi possivel carregar os dados da proposta.");
          setLead(null);
          setExistingProposal(null);
        }
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }

    void loadProposalContext();
    return () => { isCurrent = false; };
  }, [leadId]);

  // Load existing proposal data if any
  useEffect(() => {
    if (existingProposal) {
      setSetupValue(existingProposal.setupValue);
      setOverrideMRR(String(existingProposal.recurringValue));
      setVigencia("12");
      if (existingProposal.validUntil) {
        setValidUntil(existingProposal.validUntil.split("T")[0]);
      }
      
      // Parse services from item lines
      const items = existingProposal.items || [];
      const isProf = items.some((i: any) => i.serviceName.includes("Professional"));
      const isEnt = items.some((i: any) => i.serviceName.includes("Enterprise"));
      setPlanoFiscal(isEnt ? "enterprise" : isProf ? "professional" : "standard");

      const isAvanc = items.some((i: any) => i.serviceName.includes("Avançado"));
      const isPrem = items.some((i: any) => i.serviceName.includes("Premium"));
      setSuporteNivel(isPrem ? "premium" : isAvanc ? "avancado" : "basico");

      const hostLine = items.find((i: any) => i.serviceName.includes("Infraestrutura"));
      if (hostLine && hostLine.quantityLimit) {
        setHostsCount(hostLine.quantityLimit);
      }

      const routineIds = items
        .filter((i: any) => i.serviceName.includes("Rotina:"))
        .map((i: any) => {
          const name = i.serviceName.replace("Rotina: ", "");
          const match = STANDARD_ROUTINES.find(r => r.name === name);
          return match ? match.id : "";
        })
        .filter(Boolean);
      setSelectedRoutines([...new Set(["sped", "gia", ...routineIds])]);
    } else if (lead) {
      // Prefill values from lead details
      if (lead.monthlyFee) {
        setOverrideMRR(String(lead.monthlyFee));
      }
      if (lead.licenseValue) {
        setSetupValue(Number(lead.licenseValue));
      }
    }
  }, [existingProposal, lead]);

  // Pricing calculations
  const planoPrices = { standard: 150, professional: 350, enterprise: 750 };
  const planoLabels = { standard: "Standard (Até 100 Notas)", professional: "Professional (Até 500 Notas)", enterprise: "Enterprise (Até 2000 Notas)" };
  const planoDocs = { standard: 100, professional: 500, enterprise: 2000 };
  
  const suportePrices = { basico: 0, avancado: 100, premium: 250 };
  const suporteLabels = { basico: "Básico (8x5 E-mail)", avancado: "Avançado (8x5 Whats & Fone)", premium: "Premium (24x7 Plantão)" };

  const basePlanoPrice = planoPrices[planoFiscal];
  const supportPrice = suportePrices[suporteNivel];
  const additionalHostsPrice = hostsCount * 80;
  const additionalRoutinesPrice = STANDARD_ROUTINES
    .filter(r => !r.includedInBase && selectedRoutines.includes(r.id))
    .reduce((sum, r) => sum + r.price, 0);

  const calculatedMRR = basePlanoPrice + supportPrice + additionalHostsPrice + additionalRoutinesPrice;
  const displayMRR = overrideMRR !== "" ? Number(overrideMRR) : calculatedMRR;

  // Routines toggle
  const handleToggleRoutine = (id: string) => {
    setSelectedRoutines(prev => {
      if (prev.includes(id)) {
        // base ones are mandatory
        if (id === "sped" || id === "gia") return prev;
        return prev.filter(rId => rId !== id);
      }
      return [...prev, id];
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Build item lines
      const itemsPayload = [
        {
          serviceName: `Plano de Emissão: ${planoLabels[planoFiscal]}`,
          quantityLimit: planoDocs[planoFiscal],
          unitPrice: basePlanoPrice,
        },
        {
          serviceName: `Suporte Nível: ${suporteLabels[suporteNivel]}`,
          quantityLimit: null,
          unitPrice: supportPrice,
        },
      ];

      if (hostsCount > 0) {
        itemsPayload.push({
          serviceName: `Infraestrutura: Hosts Adicionais`,
          quantityLimit: hostsCount,
          unitPrice: additionalHostsPrice,
        });
      }

      STANDARD_ROUTINES.filter(r => selectedRoutines.includes(r.id)).forEach(r => {
        itemsPayload.push({
          serviceName: `Rotina: ${r.name}`,
          quantityLimit: null,
          unitPrice: r.price,
        });
      });

      const res = await trpc.crm.saveProposal.mutate({
        leadId,
        setupValue,
        recurringValue: displayMRR,
        validUntil: new Date(validUntil).toISOString(),
        items: itemsPayload,
      });

      if (res.success) {
        setExistingProposal(res.data ?? null);
        toast.success(existingProposal ? "Proposta atualizada com sucesso!" : "Proposta criada com sucesso!");
        startTransition(() => {
          router.refresh();
        });
      } else {
        toast.error("Falha ao salvar proposta.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar dados da proposta.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Carregando dados da proposta...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-6 text-center max-w-xl mx-auto my-12">
        <ShieldAlert className="h-8 w-8 text-destructive mx-auto mb-3" />
        <CardTitle className="text-foreground text-base font-bold">Lead Não Encontrado</CardTitle>
        <CardDescription className="text-xs text-muted-foreground mt-1">
          O identificador do lead fornecido é inválido ou não foi localizado.
        </CardDescription>
        <Button onClick={() => router.back()} size="sm" variant="outline" className="mt-4 gap-1.5 mx-auto">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </Card>
    );
  }

  // Parse lead contacts
  const leadContacts = Array.isArray(lead.contacts) ? (lead.contacts as any[]) : [];
  const primaryContact = leadContacts.find(c => c.isPrimary) || leadContacts[0] || null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Proposal Builder"
          description={`Monte e gerencie a proposta comercial corporativa para ${lead.companyName}`}
        />
        <Button onClick={() => router.back()} size="sm" variant="ghost" className="gap-1.5 self-start">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Editor Area */}
        <div className="space-y-6">
          {/* Card 1: Client Info */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">1. Dados do Cliente (Pré-populados)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Razão Social</Label>
                <p className="font-semibold text-foreground">{lead.companyName}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground uppercase font-bold">CNPJ</Label>
                <p className="font-medium text-foreground">{lead.document || "Não Informado"}</p>
              </div>
              {primaryContact && (
                <>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Contato Principal</Label>
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <UsersRound className="h-3.5 w-3.5 text-muted-foreground" /> {primaryContact.name} ({primaryContact.role || "Contato"})
                    </p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Canais de Contato</Label>
                    <div className="flex flex-col gap-1 text-muted-foreground">
                      {primaryContact.email && (
                        <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {primaryContact.email}</span>
                      )}
                      {primaryContact.whatsapp && (
                        <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {primaryContact.whatsapp}</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Services Scope */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">2. Composição de Serviços (Syspro Core)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-5">
              {/* Plano Fiscal */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Pacote de Emissão Fiscal</Label>
                <Select value={planoFiscal} onValueChange={(v: any) => setPlanoFiscal(v)}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard" className="text-xs">Standard — Até 100 NFe/NFce/mês (R$ 150/mês)</SelectItem>
                    <SelectItem value="professional" className="text-xs">Professional — Até 500 NFe/NFce/mês (R$ 350/mês)</SelectItem>
                    <SelectItem value="enterprise" className="text-xs">Enterprise — Até 2000 NFe/NFce/mês (R$ 750/mês)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Suporte */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Nível de Suporte Comercial</Label>
                <Select value={suporteNivel} onValueChange={(v: any) => setSuporteNivel(v)}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Selecione o suporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico" className="text-xs">Básico (8x5 E-mail) — Incluso</SelectItem>
                    <SelectItem value="avancado" className="text-xs">Avançado (8x5 Whats & Tel) — R$ 100/mês</SelectItem>
                    <SelectItem value="premium" className="text-xs">Premium (24x7 Plantão Emergência) — R$ 250/mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Hosts / Infraestrutura */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Infraestrutura: Hosts/Servidores Adicionais (+R$ 80/cad)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={hostsCount}
                    onChange={(e) => setHostsCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 h-9 text-xs"
                  />
                  <span className="text-xs text-muted-foreground">
                    Hosts adicionais para rodar nossa plataforma remota.
                  </span>
                </div>
              </div>

              <Separator className="bg-border/40" />

              {/* Rotinas Inclusas/Adicionais */}
              <div className="space-y-3">
                <Label className="text-xs font-semibold">Rotinas Fiscais & Operações Mensais</Label>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {STANDARD_ROUTINES.map((routine) => {
                    const isChecked = selectedRoutines.includes(routine.id);
                    return (
                      <div
                        key={routine.id}
                        onClick={() => handleToggleRoutine(routine.id)}
                        className={cn(
                          "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer select-none transition-colors",
                          isChecked 
                            ? "bg-primary/5 border-primary/45" 
                            : "bg-background border-border/60 hover:bg-muted/30"
                        )}
                      >
                        <Checkbox checked={isChecked} onCheckedChange={() => {}} className="pointer-events-none mt-0.5" />
                        <div>
                          <p className="font-semibold text-foreground">{routine.name}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {routine.includedInBase ? "Incluso no pacote base" : `+ R$ ${routine.price}/mês`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Commercial Conditions */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <CircleDollarSign className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">3. Condições Financeiras & Contrato</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Taxa de Setup / Implantação (R$)</Label>
                <Input
                  type="number"
                  min={0}
                  value={setupValue}
                  onChange={(e) => setSetupValue(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor Recorrente Customizado (R$/mês)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder={`Calculado: R$ ${calculatedMRR}`}
                  value={overrideMRR}
                  onChange={(e) => setOverrideMRR(e.target.value)}
                  className="h-9 text-xs"
                />
                <span className="text-[9px] text-muted-foreground block">
                  Deixe em branco para usar o recomendado de <strong>R$ {calculatedMRR}</strong>.
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Vigência do Contrato</Label>
                <Select value={vigencia} onValueChange={setVigencia}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Vigência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12" className="text-xs">12 meses</SelectItem>
                    <SelectItem value="24" className="text-xs">24 meses</SelectItem>
                    <SelectItem value="36" className="text-xs">36 meses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Índice de Reajuste</Label>
                <Select value={reajuste} onValueChange={setReajuste}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Reajuste" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IPCA" className="text-xs">IPCA (Recomendado)</SelectItem>
                    <SelectItem value="IGPM" className="text-xs">IGP-M</SelectItem>
                    <SelectItem value="NENHUM" className="text-xs">Sem Reajuste</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-semibold">Validade da Proposta</Label>
                <Input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary Area */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/[0.02] shadow-sm sticky top-6">
            <CardHeader className="pb-3 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Resumo da Proposta</CardTitle>
                <Badge variant={existingProposal ? "default" : "outline"} className="text-[9px]">
                  {existingProposal ? `V${existingProposal.version} - ${existingProposal.status}` : "NOVA"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Setup / Implantação:</span>
                  <span className="font-semibold text-foreground">R$ {setupValue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-dashed border-border/40 pt-2">
                  <span className="font-semibold text-foreground">Mensalidade (MRR):</span>
                  <span className="text-sm font-bold text-primary">R$ {displayMRR.toFixed(2)}</span>
                </div>
                {overrideMRR !== "" && Number(overrideMRR) !== calculatedMRR && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 italic text-right">
                    Desconto de R$ {(calculatedMRR - Number(overrideMRR)).toFixed(2)} aplicado!
                  </div>
                )}
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Itens Inclusos</p>
                <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                  {/* Plano */}
                  <div className="flex justify-between text-[11px] gap-2">
                    <span className="text-muted-foreground truncate">{planoLabels[planoFiscal]}</span>
                    <span className="font-medium shrink-0 text-foreground">R$ {basePlanoPrice.toFixed(2)}</span>
                  </div>
                  {/* Suporte */}
                  {supportPrice > 0 && (
                    <div className="flex justify-between text-[11px] gap-2">
                      <span className="text-muted-foreground truncate">{suporteLabels[suporteNivel]}</span>
                      <span className="font-medium shrink-0 text-foreground">R$ {supportPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Hosts */}
                  {hostsCount > 0 && (
                    <div className="flex justify-between text-[11px] gap-2">
                      <span className="text-muted-foreground truncate">Infraestrutura — {hostsCount} host(s)</span>
                      <span className="font-medium shrink-0 text-foreground">R$ {additionalHostsPrice.toFixed(2)}</span>
                    </div>
                  )}
                  {/* Rotinas */}
                  {STANDARD_ROUTINES.filter(r => selectedRoutines.includes(r.id)).map(r => (
                    <div key={r.id} className="flex justify-between text-[11px] gap-2">
                      <span className="text-muted-foreground truncate">Rotina: {r.name}</span>
                      <span className="font-medium shrink-0 text-foreground">
                        {r.price > 0 ? `R$ ${r.price.toFixed(2)}` : "Incluso"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-1.5 text-[10px] text-muted-foreground">
                <div className="flex justify-between">
                  <span>Vigência:</span>
                  <span className="font-medium text-foreground">{vigencia} meses</span>
                </div>
                <div className="flex justify-between">
                  <span>Reajuste:</span>
                  <span className="font-medium text-foreground">{reajuste}</span>
                </div>
                <div className="flex justify-between">
                  <span>Validade:</span>
                  <span className="font-medium text-foreground">{validUntil}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full h-9 gap-1.5 text-xs font-semibold shadow-sm"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Salvando..." : existingProposal ? "Atualizar Proposta" : "Gerar Proposta"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
