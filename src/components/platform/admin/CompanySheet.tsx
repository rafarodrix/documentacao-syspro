"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanySchema, CreateCompanyInput } from "@/core/validation/company-schema";
import { createCompanyAction, updateCompanyAction } from "@/app/(platform)/admin/_actions/company-actions";
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
import { PlusCircle, Loader2, Pencil, Search, Building2, MapPin, Phone, FileText } from "lucide-react";

interface CompanySheetProps {
    companyToEdit?: any;
}

export function CompanySheet({ companyToEdit }: CompanySheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [loadingCep, setLoadingCep] = useState(false);

    const isEditing = !!companyToEdit;

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
            bairro: "",
            cidade: "",
            estado: "",
            inscricaoEstadual: "",
            regimeTributario: undefined,
            observacoes: "",
        }
    });

    // Reset form quando abrir/fechar ou mudar a empresa
    useEffect(() => {
        if (open) {
            if (companyToEdit) {
                reset({
                    ...companyToEdit,
                    regimeTributario: companyToEdit.regimeTributario || undefined,
                    // Garante que campos opcionais não venham null
                    complemento: companyToEdit.complemento || "",
                    website: companyToEdit.website || "",
                    observacoes: companyToEdit.observacoes || "",
                });
            } else {
                reset({
                    cnpj: "", razaoSocial: "", nomeFantasia: "", emailContato: "", telefone: "",
                    website: "", cep: "", logradouro: "", numero: "", bairro: "", cidade: "",
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
                toast.error(typeof result.error === 'string' ? result.error : "Erro ao salvar empresa.");
            }
        });
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                        <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                        <span className="sr-only">Editar</span>
                    </Button>
                ) : (
                    <Button className="h-9 shadow-md shadow-primary/20 transition-all hover:shadow-primary/40">
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Empresa
                    </Button>
                )}
            </SheetTrigger>

            <SheetContent className="sm:max-w-xl w-full overflow-y-auto flex flex-col gap-0 p-0 border-l-border/50 bg-background/95 backdrop-blur-xl">

                {/* HEADER */}
                <div className="p-6 border-b border-border/40 bg-muted/10 sticky top-0 z-10 backdrop-blur-md">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-xl">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                <Building2 className="h-5 w-5" />
                            </div>
                            {isEditing ? "Editar Empresa" : "Nova Organização"}
                        </SheetTitle>
                        <SheetDescription>
                            Preencha os dados cadastrais da empresa cliente.
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* FORMULÁRIO SCROLLÁVEL */}
                <div className="flex-1 p-6 overflow-y-auto">
                    <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                        {/* SEÇÃO 1: DADOS GERAIS */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span>Dados Gerais</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <Label htmlFor="cnpj">CNPJ</Label>
                                    <Input
                                        id="cnpj"
                                        {...register("cnpj")}
                                        placeholder="00.000.000/0000-00"
                                        disabled={isEditing}
                                        className="font-mono bg-muted/30 focus:bg-background transition-colors"
                                    />
                                    {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj.message}</span>}
                                </div>

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

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="razaoSocial">Razão Social</Label>
                                    <Input id="razaoSocial" {...register("razaoSocial")} className="bg-muted/30 focus:bg-background" />
                                    {errors.razaoSocial && <span className="text-xs text-red-500">{errors.razaoSocial.message}</span>}
                                </div>

                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
                                    <Input id="nomeFantasia" {...register("nomeFantasia")} className="bg-muted/30 focus:bg-background" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* SEÇÃO 2: CONTATO */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span>Contato</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emailContato">E-mail Principal</Label>
                                    <Input id="emailContato" {...register("emailContato")} type="email" className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telefone">Telefone</Label>
                                    <Input id="telefone" {...register("telefone")} placeholder="(00) 00000-0000" className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 sm:col-span-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" {...register("website")} placeholder="https://" className="bg-muted/30 focus:bg-background" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-border/50" />

                        {/* SEÇÃO 3: ENDEREÇO */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
                                <div className="space-y-2 col-span-3">
                                    <Label htmlFor="logradouro">Logradouro</Label>
                                    <Input id="logradouro" {...register("logradouro")} className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 col-span-1">
                                    <Label htmlFor="estado">UF</Label>
                                    <Input id="estado" {...register("estado")} maxLength={2} className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="cidade">Cidade</Label>
                                    <Input id="cidade" {...register("cidade")} className="bg-muted/30 focus:bg-background" />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="bairro">Bairro</Label>
                                    <Input id="bairro" {...register("bairro")} className="bg-muted/30 focus:bg-background" />
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
                                placeholder="Informações adicionais sobre o cliente..."
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
                                isEditing ? "Salvar Alterações" : "Cadastrar"
                            )}
                        </Button>
                    </div>
                </SheetFooter>

            </SheetContent>
        </Sheet>
    );
}