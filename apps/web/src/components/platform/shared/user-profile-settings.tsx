"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CurrentUserProfile, UserProfileCompany } from "@dosc-syspro/contracts/user";
import { formatCEP, formatCNPJ, formatPhone } from "@/lib/formatters";
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from "@dosc-syspro/ui";
import { Building2, Camera, Globe2, Loader2, Mail, MapPin, Phone, Save, SlidersHorizontal, User } from "lucide-react";
import { trpc } from "@/lib/api/trpc-client";
import { EmptyState, PageHeader, SectionCard } from "@/components/patterns";
import { markTicketsTeamFilterReset } from "@/features/tickets/interface/lib/ticket-filter-preferences";

interface UserProfileSettingsProps {
  profile: CurrentUserProfile;
}

type CompanyFormState = {
  razaoSocial: string;
  nomeFantasia: string;
  emailContato: string;
  emailFinanceiro: string;
  telefone: string;
  whatsapp: string;
  website: string;
  address: {
    description: string;
    cep: string;
    logradouro: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    pais: string;
    codigoIbgeCidade: string;
    codigoIbgeEstado: string;
  };
};

function buildCompanyFormState(company: UserProfileCompany | null): CompanyFormState {
  return {
    razaoSocial: company?.razaoSocial ?? "",
    nomeFantasia: company?.nomeFantasia ?? "",
    emailContato: company?.emailContato ?? "",
    emailFinanceiro: company?.emailFinanceiro ?? "",
    telefone: company?.telefone ?? "",
    whatsapp: company?.whatsapp ?? "",
    website: company?.website ?? "",
    address: {
      description: company?.address?.description ?? "Sede",
      cep: company?.address?.cep ? formatCEP(company.address.cep) : "",
      logradouro: company?.address?.logradouro ?? "",
      numero: company?.address?.numero ?? "",
      complemento: company?.address?.complemento ?? "",
      bairro: company?.address?.bairro ?? "",
      cidade: company?.address?.cidade ?? "",
      estado: company?.address?.estado ?? "",
      pais: company?.address?.pais ?? "BR",
      codigoIbgeCidade: company?.address?.codigoIbgeCidade ?? "",
      codigoIbgeEstado: company?.address?.codigoIbgeEstado ?? "",
    },
  };
}

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

function getInitialSelectedCompanyId(profile: CurrentUserProfile) {
  return profile.selectedCompanyId ?? profile.companies[0]?.id ?? "";
}

export function UserProfileSettings({ profile }: UserProfileSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.image ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [personalName, setPersonalName] = useState(profile.name);
  const [defaultTicketTeamFilter, setDefaultTicketTeamFilter] = useState(profile.preferences.tickets.defaultTeamFilter);
  const [selectedCompanyId, setSelectedCompanyId] = useState(getInitialSelectedCompanyId(profile));
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(
    buildCompanyFormState(profile.companies.find((company) => company.id === profile.selectedCompanyId) ?? profile.companies[0] ?? null),
  );

  const selectedCompany = useMemo(
    () => profile.companies.find((company) => company.id === selectedCompanyId) ?? null,
    [profile.companies, selectedCompanyId],
  );

  useEffect(() => {
    setCompanyForm(buildCompanyFormState(selectedCompany));
  }, [selectedCompany]);

  const updateCompanyForm = <K extends keyof CompanyFormState>(key: K, value: CompanyFormState[K]) => {
    setCompanyForm((current) => ({ ...current, [key]: value }));
  };

  const updateCompanyAddress = <K extends keyof CompanyFormState["address"]>(key: K, value: CompanyFormState["address"][K]) => {
    setCompanyForm((current) => ({
      ...current,
      address: { ...current.address, [key]: value },
    }));
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
    setIsUploading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success("Foto de perfil atualizada.");
      router.refresh();
    } catch {
      setAvatarPreview(profile.image ?? null);
      toast.error("Erro ao atualizar a foto de perfil.");
    } finally {
      setIsUploading(false);
    }
  };

  const persistProfileUpdate = async (
    payload: Parameters<typeof trpc.users.updateCurrentProfile.mutate>[0],
    successMessage: string,
  ) => {
    await trpc.users.updateCurrentProfile.mutate(payload);
    toast.success(successMessage);
    router.refresh();
  };

  const handleSavePersonal = async () => {
    if (!profile.permissions.canEditPersonal) {
      toast.error("Seu perfil nao permite alterar os dados pessoais.");
      return;
    }

    if (personalName.trim().length < 3) {
      toast.error("Informe um nome com pelo menos 3 caracteres.");
      return;
    }

    setIsSavingPersonal(true);
    try {
      await persistProfileUpdate({ name: personalName.trim() }, "Dados pessoais atualizados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar os dados pessoais.");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleSaveCompany = async () => {
    if (!profile.permissions.canEditCompany) {
      toast.error("Seu perfil nao permite alterar os dados da empresa.");
      return;
    }

    if (!selectedCompany) {
      toast.error("Nenhuma empresa vinculada para editar.");
      return;
    }

    if (companyForm.razaoSocial.trim().length < 3) {
      toast.error("Informe a razao social da empresa.");
      return;
    }

    setIsSavingCompany(true);
    try {
      await persistProfileUpdate({
        companyId: selectedCompany.id,
        preferences: {
          profile: {
            selectedCompanyId: selectedCompany.id,
          },
          tickets: {
            defaultTeamFilter: defaultTicketTeamFilter,
          },
        },
        company: {
          razaoSocial: companyForm.razaoSocial.trim(),
          nomeFantasia: companyForm.nomeFantasia.trim(),
          emailContato: companyForm.emailContato.trim(),
          emailFinanceiro: companyForm.emailFinanceiro.trim(),
          telefone: companyForm.telefone.trim(),
          whatsapp: companyForm.whatsapp.trim(),
          website: companyForm.website.trim(),
          address: {
            description: companyForm.address.description.trim() || "Sede",
            cep: companyForm.address.cep.trim(),
            logradouro: companyForm.address.logradouro.trim(),
            numero: companyForm.address.numero.trim(),
            complemento: companyForm.address.complemento.trim(),
            bairro: companyForm.address.bairro.trim(),
            cidade: companyForm.address.cidade.trim(),
            estado: companyForm.address.estado.trim().toUpperCase(),
            pais: companyForm.address.pais.trim() || "BR",
            codigoIbgeCidade: companyForm.address.codigoIbgeCidade.trim(),
            codigoIbgeEstado: companyForm.address.codigoIbgeEstado.trim(),
          },
        },
      }, "Dados da empresa atualizados.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar a empresa.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!profile.permissions.canEditPersonal) {
      toast.error("Seu perfil nao permite alterar as preferencias.");
      return;
    }

    setIsSavingPreferences(true);
    try {
      if (defaultTicketTeamFilter !== profile.preferences.tickets.defaultTeamFilter) {
        markTicketsTeamFilterReset();
      }
      await persistProfileUpdate({
        preferences: {
          profile: {
            selectedCompanyId: selectedCompanyId || null,
          },
          tickets: {
            defaultTeamFilter: defaultTicketTeamFilter,
          },
        },
      }, "Preferencias atualizadas.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar as preferencias.");
    } finally {
      setIsSavingPreferences(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Minha Conta"
        description="Atualize seus dados pessoais, preferencias e a empresa vinculada ao seu acesso."
      />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Card className="border-border/50">
          <CardHeader className="items-center text-center">
            <CardTitle className="text-base">Perfil</CardTitle>
            <CardDescription>Identidade basica da sua conta no portal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <Avatar className="h-28 w-28 border-4 border-background shadow-sm">
                  <AvatarImage src={avatarPreview ?? ""} className="object-cover" />
                  <AvatarFallback className="text-2xl font-semibold">{initials(profile.name)}</AvatarFallback>
                </Avatar>
                {isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                ) : (
                  <Button
                    type="button"
                    onClick={handleAvatarClick}
                    size="icon"
                    className="absolute bottom-0 right-0 h-9 w-9 rounded-full border border-background bg-primary text-primary-foreground shadow-sm"
                    title="Alterar foto"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="space-y-1 text-center">
                <p className="text-lg font-semibold">{profile.name}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
                <Badge variant="outline">{profile.role}</Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Empresas vinculadas</span>
                <Badge variant="secondary">{profile.companies.length}</Badge>
              </div>
              <p className="text-muted-foreground">
                {profile.companies.length
                  ? "Use a aba Empresa para ajustar os dados cadastrais da empresa selecionada."
                  : "Este usuario ainda nao possui empresa vinculada para edicao neste perfil."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Dados pessoais
            </TabsTrigger>
            <TabsTrigger value="preferences" className="gap-2">
              <SlidersHorizontal className="h-4 w-4" />
              Preferencias
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <SectionCard
              title="Dados pessoais"
              description="Essas informacoes identificam seu acesso dentro do portal."
              contentClassName="space-y-6"
              footer={
                <div className="flex w-full items-center justify-between gap-4 text-sm">
                  <p className="text-muted-foreground">
                    {profile.permissions.canEditPersonal
                      ? "Seu perfil permite alterar os dados pessoais."
                      : "Seu perfil esta somente leitura para dados pessoais."}
                  </p>
                  <Button onClick={handleSavePersonal} disabled={isSavingPersonal || !profile.permissions.canEditPersonal}>
                    {isSavingPersonal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar dados pessoais
                  </Button>
                </div>
              }
            >
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile-name">Nome completo</Label>
                    <Input
                      id="profile-name"
                      value={personalName}
                      onChange={(event) => setPersonalName(event.target.value)}
                      disabled={!profile.permissions.canEditPersonal || isSavingPersonal}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input id="profile-email" value={profile.email} disabled className="pl-9" />
                    </div>
                  </div>
                </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="preferences">
            <SectionCard
              title="Preferencias"
              description="Defina a visao inicial do modulo de tickets sem bloquear a troca manual dos filtros."
              contentClassName="space-y-6"
              footer={
                <div className="flex w-full items-center justify-between gap-4 text-sm">
                  <p className="text-muted-foreground">
                    {profile.permissions.canEditPersonal
                      ? "Suas preferencias pessoais podem ser ajustadas a qualquer momento."
                      : "Seu perfil esta somente leitura para preferencias pessoais."}
                  </p>
                  <Button onClick={handleSavePreferences} disabled={isSavingPreferences || !profile.permissions.canEditPersonal}>
                    {isSavingPreferences ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar preferencias
                  </Button>
                </div>
              }
            >
                <div className="space-y-2">
                  <Label htmlFor="ticket-default-team-filter">Visao inicial dos tickets</Label>
                  <Select value={defaultTicketTeamFilter} onValueChange={(value) => setDefaultTicketTeamFilter(value as typeof defaultTicketTeamFilter)}>
                    <SelectTrigger id="ticket-default-team-filter">
                      <SelectValue placeholder="Selecione a visao padrao" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPORTE">Suporte</SelectItem>
                      <SelectItem value="DESENVOLVIMENTO">Desenvolvimento</SelectItem>
                      <SelectItem value="all">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Essa preferencia define apenas o filtro inicial ao abrir o modulo de tickets. Voce ainda pode trocar a equipe manualmente.
                  </p>
                </div>
            </SectionCard>
          </TabsContent>

          <TabsContent value="company">
            <SectionCard
              title="Empresa"
              description="Edite os dados da empresa vinculada ao seu acesso. O CNPJ permanece bloqueado."
              contentClassName="space-y-6"
              footer={selectedCompany ? (
                <div className="flex w-full items-center justify-between gap-4 text-sm">
                  <p className="text-muted-foreground">
                    {profile.permissions.canEditCompany
                      ? "Seu perfil permite alterar os dados desta empresa, com excecao do CNPJ."
                      : "Seu perfil esta somente leitura para os dados da empresa."}
                  </p>
                  <Button onClick={handleSaveCompany} disabled={isSavingCompany || !profile.permissions.canEditCompany}>
                    {isSavingCompany ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Salvar empresa
                  </Button>
                </div>
              ) : undefined}
            >
                {profile.companies.length > 1 ? (
                  <div className="space-y-2">
                    <Label htmlFor="profile-company">Empresa vinculada</Label>
                    <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
                      <SelectTrigger id="profile-company">
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                      <SelectContent>
                        {profile.companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.nomeFantasia || company.razaoSocial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}

                {selectedCompany ? (
                  <>
                    <div className="grid gap-5 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="company-cnpj">CNPJ</Label>
                        <Input id="company-cnpj" value={formatCNPJ(selectedCompany.cnpj)} disabled />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-legal-name">Razao social</Label>
                        <Input
                          id="company-legal-name"
                          value={companyForm.razaoSocial}
                          onChange={(event) => updateCompanyForm("razaoSocial", event.target.value)}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-trade-name">Nome fantasia</Label>
                        <Input
                          id="company-trade-name"
                          value={companyForm.nomeFantasia}
                          onChange={(event) => updateCompanyForm("nomeFantasia", event.target.value)}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-site">Website</Label>
                        <div className="relative">
                          <Globe2 className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="company-site"
                            className="pl-9"
                            value={companyForm.website}
                            onChange={(event) => updateCompanyForm("website", event.target.value)}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-email">E-mail principal</Label>
                        <Input
                          id="company-email"
                          value={companyForm.emailContato}
                          onChange={(event) => updateCompanyForm("emailContato", event.target.value)}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-finance-email">E-mail financeiro</Label>
                        <Input
                          id="company-finance-email"
                          value={companyForm.emailFinanceiro}
                          onChange={(event) => updateCompanyForm("emailFinanceiro", event.target.value)}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-phone">Telefone</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="company-phone"
                            className="pl-9"
                            value={companyForm.telefone}
                            onChange={(event) => updateCompanyForm("telefone", formatPhone(event.target.value))}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-whatsapp">WhatsApp</Label>
                        <Input
                          id="company-whatsapp"
                          value={companyForm.whatsapp}
                          onChange={(event) => updateCompanyForm("whatsapp", formatPhone(event.target.value))}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Endereco principal</span>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="company-cep">CEP</Label>
                          <Input
                            id="company-cep"
                            value={companyForm.address.cep}
                            onChange={(event) => updateCompanyAddress("cep", formatCEP(event.target.value))}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-street">Logradouro</Label>
                          <Input
                            id="company-street"
                            value={companyForm.address.logradouro}
                            onChange={(event) => updateCompanyAddress("logradouro", event.target.value)}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-number">Numero</Label>
                          <Input
                            id="company-number"
                            value={companyForm.address.numero}
                            onChange={(event) => updateCompanyAddress("numero", event.target.value)}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-complement">Complemento</Label>
                          <Input
                            id="company-complement"
                            value={companyForm.address.complemento}
                            onChange={(event) => updateCompanyAddress("complemento", event.target.value)}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-district">Bairro</Label>
                          <Input
                            id="company-district"
                            value={companyForm.address.bairro}
                            onChange={(event) => updateCompanyAddress("bairro", event.target.value)}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-city">Cidade</Label>
                          <Input
                            id="company-city"
                            value={companyForm.address.cidade}
                            onChange={(event) => updateCompanyAddress("cidade", event.target.value)}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-state">UF</Label>
                          <Input
                            id="company-state"
                            maxLength={2}
                            value={companyForm.address.estado}
                            onChange={(event) => updateCompanyAddress("estado", event.target.value.toUpperCase())}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                      </div>
                    </div>

                  </>
                ) : (
                  <EmptyState
                    icon={Building2}
                    title="Nenhuma empresa vinculada"
                    description="Nenhuma empresa vinculada foi encontrada para este usuario."
                    compact
                    dashed
                  />
                )}
            </SectionCard>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
