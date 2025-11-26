"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    User,
    Lock,
    ShieldCheck,
    Camera,
    Loader2,
    Save,
    Mail,
    History,
    CheckCircle2
} from "lucide-react";

// --- Schemas de Validação ---
const profileSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email().optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z.string().min(8, "A nova senha deve ter no mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

// Interface das Props
interface UserProfileSettingsProps {
    user: {
        name: string;
        email: string;
        image?: string | null;
        role?: string;
        twoFactorEnabled?: boolean;
    };
}

export function UserProfileSettings({ user }: UserProfileSettingsProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Forms ---
    const profileForm = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: user.name,
            email: user.email,
        }
    });

    const passwordForm = useForm({
        resolver: zodResolver(passwordSchema),
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        }
    });

    // --- Handlers ---

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Simulação de Upload (Aqui entraria a integração com S3/R2/Server Action)
        await new Promise(resolve => setTimeout(resolve, 2000));

        toast.success("Foto de perfil atualizada com sucesso!");
        setIsUploading(false);
    };

    const onProfileSubmit = async (data: any) => {
        setIsSavingProfile(true);
        // Simulação de Update
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Integração real seria: await authClient.updateUser({ name: data.name });
        toast.success("Perfil atualizado!");
        setIsSavingProfile(false);
    };

    const onPasswordSubmit = async (data: any) => {
        setIsChangingPassword(true);

        try {
            const { error } = await authClient.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                toast.error(error.message || "Erro ao alterar senha.");
            } else {
                toast.success("Senha alterada com sucesso! Faço login novamente.");
                passwordForm.reset();
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">

            {/* Cabeçalho */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                    Meu Perfil
                </h1>
                <p className="text-muted-foreground text-lg">
                    Gerencie suas informações pessoais e configurações de segurança.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_2fr]">

                {/* COLUNA ESQUERDA: Avatar & Resumo */}
                <div className="space-y-6">
                    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-b from-muted/20 to-background shadow-sm">
                        <CardHeader className="text-center pb-2">
                            <CardTitle>Foto de Perfil</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-6 pt-4">
                            <div className="relative group">
                                <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-2 ring-border/20 transition-all group-hover:scale-105">
                                    <AvatarImage src={user.image || ""} />
                                    <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                        {user.name ? user.name[0].toUpperCase() : "U"}
                                    </AvatarFallback>
                                </Avatar>

                                <button
                                    onClick={handleAvatarClick}
                                    disabled={isUploading}
                                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110 disabled:opacity-70"
                                >
                                    {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="text-center space-y-1">
                                <p className="font-medium text-sm text-muted-foreground">
                                    Clique no ícone da câmera para alterar.
                                </p>
                                <p className="text-xs text-muted-foreground/60">
                                    JPG, GIF ou PNG. Máx 2MB.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <nav className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <a href="#personal-info" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted hover:text-foreground transition-colors">
                            <User className="h-4 w-4" /> Dados Pessoais
                        </a>
                        <a href="#security" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted hover:text-foreground transition-colors">
                            <ShieldCheck className="h-4 w-4" /> Segurança & Senha
                        </a>
                        <a href="#sessions" className="flex items-center gap-2 p-2 rounded-md hover:bg-muted hover:text-foreground transition-colors">
                            <History className="h-4 w-4" /> Histórico de Acesso
                        </a>
                    </nav>
                </div>

                {/* COLUNA DIREITA: Formulários */}
                <div className="space-y-8">

                    {/* SEÇÃO 1: Informações Pessoais */}
                    <Card id="personal-info" className="border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Informações Pessoais</CardTitle>
                                    <CardDescription>Atualize seus dados de identificação.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input
                                            id="name"
                                            {...profileForm.register("name")}
                                            className="bg-muted/30 focus:bg-background transition-colors"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <div className="relative">
                                            <Input
                                                id="email"
                                                {...profileForm.register("email")}
                                                disabled
                                                className="pl-9 bg-muted/50 text-muted-foreground"
                                            />
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">O e-mail não pode ser alterado manualmente.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={isSavingProfile} className="shadow-lg shadow-blue-500/20">
                                        {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* SEÇÃO 2: Segurança */}
                    <Card id="security" className="border-border/50 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle>Segurança da Conta</CardTitle>
                                    <CardDescription>Gerencie sua senha e autenticação de dois fatores.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">

                            {/* 2FA Toggle */}
                            <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base font-medium">Autenticação em Dois Fatores (2FA)</Label>
                                        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 text-[10px] font-bold border border-green-200 dark:border-green-900">RECOMENDADO</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Adiciona uma camada extra de segurança à sua conta.
                                    </p>
                                </div>
                                <Switch checked={user.twoFactorEnabled} onCheckedChange={() => toast.info("Funcionalidade em breve!")} />
                            </div>

                            <Separator />

                            {/* Alteração de Senha */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Alterar Senha</h3>
                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Senha Atual</Label>
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                {...passwordForm.register("currentPassword")}
                                                className="bg-muted/30"
                                            />
                                            {passwordForm.formState.errors.currentPassword && (
                                                <span className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">Nova Senha</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                {...passwordForm.register("newPassword")}
                                                className="bg-muted/30"
                                            />
                                            {passwordForm.formState.errors.newPassword && (
                                                <span className="text-xs text-red-500">{passwordForm.formState.errors.newPassword.message}</span>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                {...passwordForm.register("confirmPassword")}
                                                className="bg-muted/30"
                                            />
                                            {passwordForm.formState.errors.confirmPassword && (
                                                <span className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" variant="outline" disabled={isChangingPassword} className="border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900 dark:hover:bg-amber-950/30">
                                            {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                                            Atualizar Senha
                                        </Button>
                                    </div>
                                </form>
                            </div>

                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}