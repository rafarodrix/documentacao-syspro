"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CurrentUserProfile, UserProfileCompany } from "@dosc-syspro/contracts/user";
import { formatCEP, formatCNPJ, formatPhone } from "@/lib/formatters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Camera, Globe2, Loader2, Mail, MapPin, Phone, Save, User } from "lucide-react";
import { trpc } from "@/lib/api/trpc-client";

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

export function UserProfileSettings({ profile }: UserProfileSettingsProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.image ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [personalName, setPersonalName] = useState(profile.name);
  const [selectedCompanyId, setSelectedCompanyId] = useState(profile.selectedCompanyId ?? profile.companies[0]?.id ?? "");
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
      await trpc.users.updateCurrentProfile.mutate({ name: personalName.trim() });
      toast.success("Dados pessoais atualizados.");
      router.refresh();
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
      await trpc.users.updateCurrentProfile.mutate({
        companyId: selectedCompany.id,
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
      });
      toast.success("Dados da empresa atualizados.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nao foi possivel atualizar a empresa.");
    } finally {
      setIsSavingCompany(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Minha Conta</h1>
        <p className="text-muted-foreground">Atualize seus dados pessoais e os dados da empresa vinculada ao seu acesso.</p>
      </div>

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
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    className="absolute bottom-0 right-0 rounded-full border border-background bg-primary p-2 text-primary-foreground shadow-sm"
                    title="Alterar foto"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="personal" className="gap-2">
              <User className="h-4 w-4" />
              Dados pessoais
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building2 className="h-4 w-4" />
              Empresa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Dados pessoais</CardTitle>
                <CardDescription>Essas informacoes identificam seu acesso dentro do portal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
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
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="company">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Empresa</CardTitle>
                <CardDescription>Edite os dados da empresa vinculada ao seu acesso. O CNPJ permanece bloqueado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                          onChange={(event) => setCompanyForm((current) => ({ ...current, razaoSocial: event.target.value }))}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-trade-name">Nome fantasia</Label>
                        <Input
                          id="company-trade-name"
                          value={companyForm.nomeFantasia}
                          onChange={(event) => setCompanyForm((current) => ({ ...current, nomeFantasia: event.target.value }))}
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
                            onChange={(event) => setCompanyForm((current) => ({ ...current, website: event.target.value }))}
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-email">E-mail principal</Label>
                        <Input
                          id="company-email"
                          value={companyForm.emailContato}
                          onChange={(event) => setCompanyForm((current) => ({ ...current, emailContato: event.target.value }))}
                          disabled={!profile.permissions.canEditCompany || isSavingCompany}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-finance-email">E-mail financeiro</Label>
                        <Input
                          id="company-finance-email"
                          value={companyForm.emailFinanceiro}
                          onChange={(event) => setCompanyForm((current) => ({ ...current, emailFinanceiro: event.target.value }))}
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
                            onChange={(event) =>
                              setCompanyForm((current) => ({ ...current, telefone: formatPhone(event.target.value) }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company-whatsapp">WhatsApp</Label>
                        <Input
                          id="company-whatsapp"
                          value={companyForm.whatsapp}
                          onChange={(event) =>
                            setCompanyForm((current) => ({ ...current, whatsapp: formatPhone(event.target.value) }))
                          }
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
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, cep: formatCEP(event.target.value) },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-street">Logradouro</Label>
                          <Input
                            id="company-street"
                            value={companyForm.address.logradouro}
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, logradouro: event.target.value },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-number">Numero</Label>
                          <Input
                            id="company-number"
                            value={companyForm.address.numero}
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, numero: event.target.value },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-complement">Complemento</Label>
                          <Input
                            id="company-complement"
                            value={companyForm.address.complemento}
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, complemento: event.target.value },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-district">Bairro</Label>
                          <Input
                            id="company-district"
                            value={companyForm.address.bairro}
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, bairro: event.target.value },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-city">Cidade</Label>
                          <Input
                            id="company-city"
                            value={companyForm.address.cidade}
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, cidade: event.target.value },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company-state">UF</Label>
                          <Input
                            id="company-state"
                            maxLength={2}
                            value={companyForm.address.estado}
                            onChange={(event) =>
                              setCompanyForm((current) => ({
                                ...current,
                                address: { ...current.address, estado: event.target.value.toUpperCase() },
                              }))
                            }
                            disabled={!profile.permissions.canEditCompany || isSavingCompany}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
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
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
                    Nenhuma empresa vinculada foi encontrada para este usuario.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
