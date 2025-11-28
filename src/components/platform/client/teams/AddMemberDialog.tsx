"use client";

import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface AddMemberDialogProps {
    companyName: string;
}

export function AddMemberDialog({ companyName }: AddMemberDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Simulação de Server Action
        await new Promise((resolve) => setTimeout(resolve, 1000));

        console.log("Usuário convidado para:", companyName);
        setIsLoading(false);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus size={16} /> Adicionar Membro
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Convidar para {companyName}</DialogTitle>
                    <DialogDescription>
                        Envie um convite para um novo membro da equipe. Ele receberá um e-mail de acesso.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" placeholder="Ex: João Silva" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="email">E-mail Corporativo</Label>
                        <Input id="email" type="email" placeholder="joao@empresa.com" required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="role">Nível de Acesso</Label>
                        <Select defaultValue="member">
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o cargo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="admin">Administrador (Acesso total)</SelectItem>
                                <SelectItem value="member">Membro (Operacional)</SelectItem>
                                <SelectItem value="viewer">Visualizador (Somente leitura)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enviar Convite
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}