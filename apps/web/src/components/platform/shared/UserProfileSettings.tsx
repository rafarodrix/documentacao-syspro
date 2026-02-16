"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    User,
    Lock,
    ShieldCheck,
    Camera,
    Loader2,
    Save,
    Mail,
    History,
    CheckCircle2,
    UploadCloud
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
    const router = useRouter();
    const [isUploading, setIsUploading] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.image || null);

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

        // 1. Mostra preview imediato
        const objectUrl = URL.createObjectURL(file);
        setAvatarPreview(objectUrl);

        setIsUploading(true);

        try {
            // TODO: Aqui você deve implementar o upload real para S3/R2/Uploadthing
            // Exemplo: const url = await uploadFile(file);
            // await authClient.updateUser({ image: url });

            // Simulação para feedback visual
            await new Promise(resolve => setTimeout(resolve, 1500));
            toast.success("Foto de perfil atualizada!");
            router.refresh();
        } catch (error) {
            toast.error("Erro ao enviar imagem.");
            setAvatarPreview(user.image || null); // Reverte em caso de erro
        } finally {
            setIsUploading(false);
        }
    };

    const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
        setIsSavingProfile(true);
        try {
            // Chamada REAL ao Better Auth para atualizar o usuário
            const { error } = await authClient.updateUser({
                name: data.name,
                // image: avatarPreview // Se tiver upload real, passaria a URL aqui
            });

            if (error) {
                toast.error(error.message || "Erro ao atualizar perfil.");
            } else {
                toast.success("Perfil atualizado com sucesso!");
                router.refresh(); // Atualiza os dados da sessão na interface (Header/Sidebar)
            }
        } catch (err) {
            toast.error("Erro de conexão.");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
        setIsChangingPassword(true);

        try {
            const { error } = await authClient.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                revokeOtherSessions: true,
            });

            if (error) {
                toast.error(error.message || "A senha atual está incorreta.");
            } else {
                toast.success("Senha alterada com sucesso! Por favor, faça login novamente.");
                passwordForm.reset();
                // Opcional: router.push('/login');
            }
        } catch (err) {
            toast.error("Erro ao tentar alterar a senha.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">

            {/* Cabeçalho */}
            <div className="flex flex-col gap-1">
                <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 w-fit">
                    Minha Conta
                </h1>
                <p className="text-muted-foreground text-lg">
                    Gerencie suas informações pessoais e preferências de segurança.
                </p>
            </div>

            <div className="grid gap-8 md:grid-cols-[1fr_2fr]">

                {/* COLUNA ESQUERDA: Avatar & Resumo */}
                <div className="space-y-6">
                    <Card className="relative overflow-hidden border-border/50 bg-gradient-to-b from-muted/30 to-background shadow-sm">
                        <CardHeader className="text-center pb-2">
                            <CardTitle className="text-base font-medium">Foto de Perfil</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center gap-6 pt-4">
                            <div className="relative group">
                                <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-1 ring-border/20 transition-all group-hover:scale-105">
                                    {/* CORREÇÃO AQUI: substituído objectFit="cover" por className="object-cover" */}
                                    <AvatarImage src={avatarPreview || ""} className="object-cover" />
                                    <AvatarFallback className="text-4xl bg-primary/10 text-primary font-bold">
                                        {user.name ? user.name[0].toUpperCase() : "U"}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Overlay de Loading ou Botão */}
                                {isUploading ? (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full backdrop-blur-sm">
                                        <Loader2 className="h-8 w-8 text-white animate-spin" />
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleAvatarClick}
                                        className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-110 border-2 border-background"
                                        title="Alterar foto"
                                    >
                                        <Camera className="h-4 w-4" />
                                    </button>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="text-center space-y-1.5">
                                <Badge variant="outline" className="font-normal text-xs bg-background/50 backdrop-blur-sm">
                                    {user.role || "Usuário"}
                                </Badge>
                                <p className="text-xs text-muted-foreground/70 px-4">
                                    Recomendado: JPG ou PNG, min 400x400px.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <nav className="flex flex-col gap-1 text-sm font-medium text-muted-foreground">
                        <Button variant="ghost" className="justify-start gap-3 hover:bg-muted/50" asChild>
                            <a href="#personal-info">
                                <User className="h-4 w-4" /> Dados Pessoais
                            </a>
                        </Button>
                        <Button variant="ghost" className="justify-start gap-3 hover:bg-muted/50" asChild>
                            <a href="#security">
                                <ShieldCheck className="h-4 w-4" /> Segurança & Senha
                            </a>
                        </Button>
                    </nav>
                </div>

                {/* COLUNA DIREITA: Formulários */}
                <div className="space-y-8">

                    {/* SEÇÃO 1: Informações Pessoais */}
                    <Card id="personal-info" className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10">
                                    <User className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                                    <CardDescription>Atualize como você é identificado na plataforma.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Nome Completo</Label>
                                        <Input
                                            id="name"
                                            {...profileForm.register("name")}
                                            className="bg-muted/30 focus:bg-background transition-all"
                                        />
                                        {profileForm.formState.errors.name && (
                                            <span className="text-xs text-red-500">{profileForm.formState.errors.name.message}</span>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">E-mail</Label>
                                        <div className="relative">
                                            <Input
                                                id="email"
                                                {...profileForm.register("email")}
                                                disabled
                                                className="pl-9 bg-muted/50 text-muted-foreground opacity-70"
                                            />
                                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground opacity-50" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Para alterar o e-mail, contate o administrador.</p>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button type="submit" disabled={isSavingProfile} className="shadow-md shadow-blue-500/10 transition-all hover:shadow-blue-500/20">
                                        {isSavingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* SEÇÃO 2: Segurança */}
                    <Card id="security" className="border-border/50 shadow-sm bg-background/60 backdrop-blur-sm">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10">
                                    <Lock className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Segurança</CardTitle>
                                    <CardDescription>Mantenha sua conta protegida.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">

                            {/* 2FA Toggle */}
                            <div className="flex flex-row items-center justify-between rounded-xl border border-border/60 p-4 bg-muted/10">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Label className="text-base font-medium">Autenticação em Dois Fatores (2FA)</Label>
                                        <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-600 border-green-200 dark:border-green-900">
                                            RECOMENDADO
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        Proteja sua conta exigindo um código extra ao fazer login.
                                    </p>
                                </div>
                                <Switch checked={user.twoFactorEnabled} onCheckedChange={() => toast.info("Funcionalidade será ativada em breve!")} />
                            </div>

                            <Separator className="bg-border/50" />

                            {/* Alteração de Senha */}
                            <div className="space-y-5">
                                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" /> Alterar Senha
                                </h3>

                                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="currentPassword">Senha Atual</Label>
                                            <Input
                                                id="currentPassword"
                                                type="password"
                                                {...passwordForm.register("currentPassword")}
                                                className="bg-muted/30 focus:bg-background transition-all"
                                                placeholder="••••••••"
                                            />
                                            {passwordForm.formState.errors.currentPassword && (
                                                <span className="text-xs text-red-500">{passwordForm.formState.errors.currentPassword.message}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid gap-5 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="newPassword">Nova Senha</Label>
                                            <Input
                                                id="newPassword"
                                                type="password"
                                                {...passwordForm.register("newPassword")}
                                                className="bg-muted/30 focus:bg-background transition-all"
                                                placeholder="••••••••"
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
                                                className="bg-muted/30 focus:bg-background transition-all"
                                                placeholder="••••••••"
                                            />
                                            {passwordForm.formState.errors.confirmPassword && (
                                                <span className="text-xs text-red-500">{passwordForm.formState.errors.confirmPassword.message}</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" variant="outline" disabled={isChangingPassword} className="border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-900 dark:hover:bg-amber-950/30 transition-all">
                                            {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
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