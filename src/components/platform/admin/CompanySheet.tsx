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
// MUDANÇA 1: Trocamos Sheet por Dialog
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PlusCircle, Loader2, Pencil, Search } from "lucide-react";

interface CompanyDialogProps {
    companyToEdit?: any;
}

export function CompanySheet({ companyToEdit }: CompanyDialogProps) { // Pode manter o nome da função se preferir não quebrar imports
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
            reset();
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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4 mr-2" /> Editar
                    </Button>
                ) : (
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" /> Nova Empresa
                    </Button>
                )}
            </DialogTrigger>

            {/* MUDANÇA 2: max-w-4xl para ficar bem largo e max-h-[90vh] para não estourar a tela */}
            <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader>
                    <DialogTitle>{isEditing ? "Editar Empresa" : "Cadastrar Empresa"}</DialogTitle>
                    <DialogDescription>Preencha os dados cadastrais completos.</DialogDescription>
                </DialogHeader>

                {/* Área de Scroll apenas para o formulário */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <form id="company-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">

                        {/* DADOS GERAIS - Grid de 3 colunas agora */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dados Gerais</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input {...register("cnpj")} placeholder="00.000.000/0000-00" disabled={isEditing} />
                                    {errors.cnpj && <span className="text-xs text-red-500">{errors.cnpj.message}</span>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Razão Social</Label>
                                    <Input {...register("razaoSocial")} />
                                    {errors.razaoSocial && <span className="text-xs text-red-500">{errors.razaoSocial.message}</span>}
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Nome Fantasia</Label>
                                    <Input {...register("nomeFantasia")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Regime Tributário</Label>
                                    <Select onValueChange={(val) => setValue("regimeTributario", val as any)} defaultValue={companyToEdit?.regimeTributario || undefined}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SIMPLES_NACIONAL">Simples Nacional</SelectItem>
                                            <SelectItem value="SIMPLES_NACIONAL_EXCESSO">Simples (Excesso)</SelectItem>
                                            <SelectItem value="LUCRO_PRESUMIDO">Lucro Presumido</SelectItem>
                                            <SelectItem value="LUCRO_REAL">Lucro Real</SelectItem>
                                            <SelectItem value="MEI">MEI</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* CONTATO */}
                        <div className="space-y-3 pt-2 border-t">
                            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">Contato</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>E-mail</Label>
                                    <Input {...register("emailContato")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone</Label>
                                    <Input {...register("telefone")} placeholder="(00) 00000-0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Website</Label>
                                    <Input {...register("website")} placeholder="https://..." />
                                </div>
                            </div>
                        </div>

                        {/* ENDEREÇO */}
                        <div className="space-y-3 pt-2 border-t">
                            <div className="flex items-center justify-between mt-2">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Endereço</h3>
                                {loadingCep && <span className="text-xs text-primary animate-pulse">Buscando CEP...</span>}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-2">
                                    <Label>CEP</Label>
                                    <div className="relative">
                                        <Input {...register("cep")} onBlur={handleCepBlur} placeholder="00000-000" />
                                        <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                    </div>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Cidade</Label>
                                    <Input {...register("cidade")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>UF</Label>
                                    <Input {...register("estado")} maxLength={2} />
                                </div>
                                <div className="space-y-2 md:col-span-3">
                                    <Label>Logradouro</Label>
                                    <Input {...register("logradouro")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Número</Label>
                                    <Input id="numero" {...register("numero")} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Bairro</Label>
                                    <Input {...register("bairro")} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Complemento</Label>
                                    <Input {...register("complemento")} />
                                </div>
                            </div>
                        </div>

                        {/* FISCAL & OBS - Lado a Lado */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t">
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">Inscrições</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Insc. Estadual</Label>
                                        <Input {...register("inscricaoEstadual")} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Insc. Municipal</Label>
                                        <Input {...register("inscricaoMunicipal")} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mt-2">Observações</h3>
                                <Textarea {...register("observacoes")} placeholder="Anotações internas..." className="h-20" />
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer fixo no final do modal */}
                <DialogFooter className="pt-4 border-t">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button type="submit" form="company-form" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? "Salvar Alterações" : "Salvar Cadastro")}
                    </Button>
                </DialogFooter>

            </DialogContent>
        </Dialog>
    );
}