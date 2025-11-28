"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanySchema, CreateCompanyInput } from "@/core/schema/company-schema";
import {
    createCompanyAction,
    updateCompanyAction,
    toggleCompanyStatusAction
} from "@/app/(platform)/admin/_actions/company-actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    PlusCircle,
    Loader2,
    Pencil,
    Search,
    Building2,
    MapPin,
    Phone,
    FileText,
    Ban,
    CheckCircle,
    Landmark
} from "lucide-react";

interface CompanySheetProps {
    companyToEdit?: any;
}

export function CompanySheet({ companyToEdit }: CompanySheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isStatusPending, startStatusTransition] = useTransition();
    const [loadingCep, setLoadingCep] = useState(false);

    const isEditing = !!companyToEdit;
    const isActive = companyToEdit?.status === 'ACTIVE';

    const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CreateCompanyInput>({
        resolver: zodResolver(createCompanySchema),
        defaultValues: {
            cnpj: "",
            razaoSocial: "",
            nomeFantasia: "",
            emailContato: "",
            telefone: "",
            website: "",
            cep: "",
            logradouro: "",
            numero: "",
            complemento: "", // Adicionado
            bairro: "",
            cidade: "",
            estado: "",
            inscricaoEstadual: "", // Restaurado
            inscricaoMunicipal: "",
            regimeTributario: undefined,
            observacoes: "",
        }
    });

    useEffect(() => {
        if (open) {
            if (companyToEdit) {
                reset({
                    ...companyToEdit,
                    regimeTributario: companyToEdit.regimeTributario || undefined,
                    complemento: companyToEdit.complemento || "",
                    website: companyToEdit.website || "",
                    observacoes: companyToEdit.observacoes || "",
                    inscricaoEstadual: companyToEdit.inscricaoEstadual || "",
                    inscricaoMunicipal: companyToEdit.inscricaoMunicipal || "",
                });
            } else {
                reset({
                    cnpj: "", razaoSocial: "", nomeFantasia: "", emailContato: "", telefone: "",
                    website: "", cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "",
                    estado: "", inscricaoEstadual: "", inscricaoMunicipal: "", observacoes: "",
                    regimeTributario: undefined
                });
            }
        }
    }, [open, companyToEdit, reset]);

    const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            setLoadingCep(true);
            try {
                const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await response.json();
                if (!data.erro) {
                    setValue("logradouro", data.logradouro);
                    setValue("bairro", data.bairro);
                    setValue("cidade", data.localidade);
                    setValue("estado", data.uf);
                    document.getElementById("numero")?.focus();
                } else {
                    toast.error("CEP não encontrado.");
                }
            } catch (error) {
                toast.error("Erro ao buscar CEP.");
            } finally {
                setLoadingCep(false);
            }
        }
    };

    const handleToggleStatus = () => {
        if (!companyToEdit) return;

        startStatusTransition(async () => {
            const result = await toggleCompanyStatusAction(companyToEdit.id, companyToEdit.status);
            if (result.success) {
                toast.success(result.message);
                setOpen(false);
            } else {
                toast.error(typeof result.error === 'string' ? result.error : "Erro ao alterar status.");
            }
        });
    };

    async function onSubmit(data: CreateCompanyInput) {
        startTransition(async () => {
            let result;
            if (isEditing && companyToEdit) {
                result = await updateCompanyAction(companyToEdit.id, data);
            } else {
                result = await createCompanyAction(data);
            }

            if (result.success) {
                toast.success(isEditing ? "Empresa atualizada!" : "Empresa criada com sucesso!");
                setOpen(false);
            } else {
                const errorMsg = typeof result.error === 'string'
                    ? result.error
                    : "Verifique os campos obrigatórios.";
                toast.error(errorMsg);
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        <span className="sr-only">Editar</span>
                    </Button>
                ) : (
                    <Button className="h-9 shadow-md shadow-primary/20 transition-all hover:shadow-primary/40 hover:-translate-y-0.5">
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Empresa
                    </Button>
                )}
            </SheetTrigger>

            <SheetContent className="sm:max-w-xl w-full overflow-y-auto flex flex-col gap-0 p-0 border-l-border/50 bg-background/95 backdrop-blur-xl">

                {/* HEADER */}
                <div className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md flex justify-between items-start">
                    <div>
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-2 text-xl">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/10">
                                    <Building2 className="h-5 w-5" />
                                </div>
                                {isEditing ? "Gerenciar Empresa" : "Nova Organização"}
                            </SheetTitle>
                            <SheetDescription>
                                {isEditing
                                    ? "Edite os dados cadastrais ou altere o status."
                                    : "Preencha os dados para cadastrar um novo cliente."}
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    {isEditing && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleToggleStatus}
                            disabled={isStatusPending}
                            className={`ml-4 border-dashed ${isActive
                                ? "border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 dark:hover:bg-red-950/20"
                                : "border-green-200 hover:border-green-500 hover:bg-green-50 text-green-600 dark:hover:bg-green-950/20"
                                }`}
                        >
                            {isStatusPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isActive ? (
                                <>
                                    <Ban className="h-4 w-4 mr-2" /> Desativar
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Ativar
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* FORMULÁRIO */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                        {/* SEÇÃO 1: DADOS GERAIS */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                <FileText className="h-4 w-4" />
                                <span>Dados Corporativos</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* CNPJ */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="cnpj">CNPJ</Label>
                                    <div className="relative">
                                        <Input
                                            id="cnpj"
                                            {...register("cnpj")}
                                            placeholder="00.000.000/0000-00"
                                            disabled={isEditing}
                                            className="font-mono bg-muted/30 focus:bg-background transition-colors pl-9"
                                        />
                                        <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                    </div>
                                    {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj.message}</span>}
                                </div>

                                {/* Regime Tributário */}
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="regime">Regime Tributário</Label>
                                    <Select onValueChange={(val) => setValue("regimeTributario", val as any)} defaultValue={companyToEdit?.regimeTributario || undefined}>
                                        <SelectTrigger className="bg-muted/30 focus:bg-background">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                                            <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                                            <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                                            <SelectItem value="MEI">MEI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Razão Social */}
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="razaoSocial">Razão Social</Label>
                                    <Input id="razaoSocial" {...register("razaoSocial")} className="bg-muted/30 focus:bg-background font-medium" />
                                    {errors.razaoSocial && <span className="text-xs text-red-500">{errors.razaoSocial.message}</span>}
                                </div>

                                {/* Nome Fantasia */}
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                                    <Input id="nomeFantasia" {...register("nomeFantasia")} className="bg-muted/30 focus:bg-background" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* SEÇÃO 2: INFORMAÇÕES FISCAIS (Restauradas) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                <Landmark className="h-4 w-4" />
                                <span>Fiscal</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Inscrição Estadual</Label>
                                    <Input {...register("inscricaoEstadual")} placeholder="Isento ou Número" className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label>Inscrição Municipal</Label>
                                    <Input {...register("inscricaoMunicipal")} className="bg-muted/30 focus:bg-background" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* SEÇÃO 3: CONTATO */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                <Phone className="h-4 w-4" />
                                <span>Contato</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emailContato">E-mail Financeiro/Admin</Label>
                                    <Input id="emailContato" {...register("emailContato")} type="email" className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefone">Telefone / Celular</Label>
                                    <Input id="telefone" {...register("telefone")} placeholder="(00) 00000-0000" className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" {...register("website")} placeholder="https://" className="bg-muted/30 focus:bg-background" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* SEÇÃO 4: ENDEREÇO (Com Complemento) */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-wider bg-primary/5 p-2 rounded-md w-fit">
                                <MapPin className="h-4 w-4" />
                                <span>Endereço</span>
                            </div>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="cep">CEP</Label>
                                    <div className="relative">
                                        <Input
                                            id="cep"
                                            {...register("cep")}
                                            onBlur={handleCepBlur}
                                            placeholder="00000-000"
                                            className="pr-8 bg-muted/30 focus:bg-background"
                                        />
                                        <div className="absolute right-2.5 top-2.5 text-muted-foreground">
                                            {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 opacity-50" />}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="numero">Número</Label>
                                    <Input id="numero" {...register("numero")} className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 col-span-4 sm:col-span-3">
                                    <Label htmlFor="logradouro">Logradouro</Label>
                                    <Input id="logradouro" {...register("logradouro")} className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 col-span-4 sm:col-span-1">
                                    <Label htmlFor="estado">UF</Label>
                                    <Input id="estado" {...register("estado")} maxLength={2} className="bg-muted/30 focus:bg-background" />
                                </div>

                                {/* Campo Complemento Adicionado */}
                                <div className="space-y-2 col-span-4 sm:col-span-2">
                                    <Label htmlFor="complemento">Complemento</Label>
                                    <Input id="complemento" {...register("complemento")} placeholder="Sala, Bloco, Apto..." className="bg-muted/30 focus:bg-background" />
                                </div>

                                <div className="space-y-2 col-span-4 sm:col-span-2">
                                    <Label htmlFor="bairro">Bairro</Label>
                                    <Input id="bairro" {...register("bairro")} className="bg-muted/30 focus:bg-background" />
                                </div>

                                <div className="space-y-2 col-span-4">
                                    <Label htmlFor="cidade">Cidade</Label>
                                    <Input id="cidade" {...register("cidade")} className="bg-muted/30 focus:bg-background" />
                                </div>
                            </div>
                        </div>

                        {/* EXTRAS */}
                        <div className="space-y-2">
                            <Label htmlFor="observacoes">Observações Internas</Label>
                            <Textarea
                                id="observacoes"
                                {...register("observacoes")}
                                className="min-h-[100px] bg-muted/30 focus:bg-background resize-y"
                                placeholder="Informações adicionais sobre o cliente, responsável técnico, etc..."
                            />
                        </div>

                    </form>
                </div>

                {/* FOOTER FIXO */}
                <SheetFooter className="p-6 border-t border-border/40 bg-muted/10 sticky bottom-0 z-10 backdrop-blur-md">
                    <div className="flex w-full justify-end gap-3">
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" form="company-form" disabled={isPending} className="min-w-[120px] shadow-lg shadow-primary/20">
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                                </>
                            ) : (
                                isEditing ? "Salvar Alterações" : "Cadastrar Empresa"
                            )}
                        </Button>
                    </div>
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}