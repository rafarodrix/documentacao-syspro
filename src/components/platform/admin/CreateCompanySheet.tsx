"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createCompanySchema, CreateCompanyInput } from "@/core/validation/company-schema";
import { createCompanyAction } from "@/app/(platform)/admin/_actions/company-actions";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PlusCircle, Loader2 } from "lucide-react";

export function CreateCompanySheet() {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateCompanyInput>({
    resolver: zodResolver(createCompanySchema),
  });

  async function onSubmit(data: CreateCompanyInput) {
    setIsPending(true);
    const result = await createCompanyAction(data);
    setIsPending(false);

    if (result.success) {
      toast.success("Empresa cadastrada com sucesso!");
      setOpen(false);
      reset();
    } else {
      toast.error(typeof result.error === 'string' ? result.error : "Erro na validação");
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Nova Empresa
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Cadastrar Empresa</SheetTitle>
          <SheetDescription>
            Adicione um novo cliente ao portal Trilink.
          </SheetDescription>
        </SheetHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input id="cnpj" placeholder="00.000.000/0000-00" {...register("cnpj")} />
            {errors.cnpj && <span className="text-sm text-red-500">{errors.cnpj.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="razaoSocial">Razão Social</Label>
            <Input id="razaoSocial" {...register("razaoSocial")} />
            {errors.razaoSocial && <span className="text-sm text-red-500">{errors.razaoSocial.message}</span>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nomeFantasia">Nome Fantasia</Label>
            <Input id="nomeFantasia" {...register("nomeFantasia")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emailContato">E-mail de Contato</Label>
            <Input id="emailContato" type="email" {...register("emailContato")} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar Cadastro"}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}