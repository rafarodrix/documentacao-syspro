"use client";

import { useState, useEffect } from "react";
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
import { PlusCircle, Loader2, Pencil, Search } from "lucide-react";

interface CompanySheetProps {
    companyToEdit?: any;
}

export function CompanySheet({ companyToEdit }: CompanySheetProps) {
    const [open, setOpen] = useState(false);
    const [isPending, setIsPending] = useState(false);
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

    // Preenche o formulário ao abrir (Modo Edição)
    useEffect(() => {
        if (open && companyToEdit) {
            reset({
                cnpj: companyToEdit.cnpj || "",
                razaoSocial: companyToEdit.razaoSocial || "",
                nomeFantasia: companyToEdit.nomeFantasia || "",
                emailContato: companyToEdit.emailContato || "",
                telefone: companyToEdit.telefone || "",
                website: companyToEdit.website || "",
                cep: companyToEdit.cep || "",
                logradouro: companyToEdit.logradouro || "",
                numero: companyToEdit.numero || "",
                complemento: companyToEdit.complemento || "",
                bairro: companyToEdit.bairro || "",
                cidade: companyToEdit.cidade || "",
                estado: companyToEdit.estado || "",
                inscricaoEstadual: companyToEdit.inscricaoEstadual || "",
                inscricaoMunicipal: companyToEdit.inscricaoMunicipal || "",
                regimeTributario: companyToEdit.regimeTributario || undefined,
                observacoes: companyToEdit.observacoes || "",
            });
        } else if (open && !companyToEdit) {
            reset(); // Limpa (Modo Criação)
        }
    }, [open, companyToEdit, reset]);

    // Busca de CEP (ViaCEP)
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
        setIsPending(true);
        let result;

        if (isEditing && companyToEdit) {
            result = await updateCompanyAction(companyToEdit.id, data);
        } else {
            result = await createCompanyAction(data);
        }

        setIsPending(false);

        if (result.success) {
            toast.success(isEditing ? "Empresa atualizada!" : "Empresa criada!");
            setOpen(false);
            if (!isEditing) reset();
        } else {
            toast.error(typeof result.error === 'string' ? result.error : "Erro ao salvar");
        }
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                ) : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Empresa
                    </Button>
                )}
            </SheetTrigger>

            <SheetContent className="sm:max-w-[600px] w-full overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>{isEditing ? "Editar Empresa" : "Cadastrar Empresa"}</SheetTitle>
                    <SheetDescription>Preencha os dados cadastrais completos.</SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6 pb-10">

                    {/* DADOS GERAIS */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="text-sm font-semibold text-muted-foreground">Dados Gerais</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>CNPJ</Label>
                                <Input {...register("cnpj")} placeholder="00.000.000/0000-00" disabled={isEditing} />
                                {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj.message}</span>}
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Razão Social</Label>
                                <Input {...register("razaoSocial")} />
                                {errors.razaoSocial && <span className="text-xs text-red-500">{errors.razaoSocial.message}</span>}
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Nome Fantasia</Label>
                                <Input {...register("nomeFantasia")} />
                            </div>
                        </div>
                    </div>

                    {/* CONTATO */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="text-sm font-semibold text-muted-foreground">Contato</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>E-mail</Label>
                                <Input {...register("emailContato")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Telefone</Label>
                                <Input {...register("telefone")} placeholder="(00) 00000-0000" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Website</Label>
                                <Input {...register("website")} placeholder="https://..." />
                            </div>
                        </div>
                    </div>

                    {/* ENDEREÇO */}
                    <div className="space-y-4 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-muted-foreground">Endereço</h3>
                            {loadingCep && <span className="text-xs text-primary animate-pulse">Buscando CEP...</span>}
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2 col-span-2">
                                <Label>CEP</Label>
                                <div className="relative">
                                    <Input {...register("cep")} onBlur={handleCepBlur} placeholder="00000-000" />
                                    <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                </div>
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Estado (UF)</Label>
                                <Input {...register("estado")} maxLength={2} placeholder="UF" />
                            </div>
                            <div className="space-y-2 col-span-3">
                                <Label>Cidade</Label>
                                <Input {...register("cidade")} />
                            </div>
                            <div className="space-y-2 col-span-4">
                                <Label>Logradouro</Label>
                                <Input {...register("logradouro")} />
                            </div>
                            <div className="space-y-2 col-span-1">
                                <Label>Número</Label>
                                <Input id="numero" {...register("numero")} />
                            </div>
                            <div className="space-y-2 col-span-3">
                                <Label>Bairro</Label>
                                <Input {...register("bairro")} />
                            </div>
                            <div className="space-y-2 col-span-4">
                                <Label>Complemento</Label>
                                <Input {...register("complemento")} />
                            </div>
                        </div>
                    </div>

                    {/* FISCAL */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="text-sm font-semibold text-muted-foreground">Fiscal</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Inscrição Estadual</Label>
                                <Input {...register("inscricaoEstadual")} />
                            </div>
                            <div className="space-y-2">
                                <Label>Inscrição Municipal</Label>
                                <Input {...register("inscricaoMunicipal")} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Regime Tributário</Label>
                                <Select onValueChange={(val) => setValue("regimeTributario", val as any)} defaultValue={companyToEdit?.regimeTributario || undefined}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o regime..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                                        <SelectItem value="SIMPLES_NACIONAL_EXCESSO">Simples Nacional (Excesso)</SelectItem>
                                        <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                                        <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                                        <SelectItem value="MEI">MEI</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* OBSERVAÇÕES */}
                    <div className="space-y-2">
                        <Label>Observações Internas</Label>
                        <Textarea {...register("observacoes")} placeholder="Informações importantes sobre este cliente..." />
                    </div>

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? "Salvar Alterações" : "Salvar Cadastro")}
                    </Button>
                </form>
            </SheetContent>
        </Sheet>
    );
}