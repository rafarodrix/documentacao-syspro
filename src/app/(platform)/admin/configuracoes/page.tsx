import { getProtectedSession } from "@/lib/auth-helpers";
import { redirect } from "next/navigation";

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, ShieldCheck, Sliders } from "lucide-react";

// Feature Components
import GeneralSettingsForm from "@/components/platform/admin/settings/GeneralSettingsForm";
import { AccessControlTab } from "@/components/platform/admin/settings/AccessControlTab";

export default async function SettingsPage() {
    // 1. Segurança: Apenas Admins e Devs acessam configurações
    const session = await getProtectedSession();
    if (!session || !["ADMIN"].includes(session.role)) {
        redirect("/admin/dashboard");
    }

    return (
        <div className="flex flex-col gap-8 p-6 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">

            {/* --- HEADER --- */}
            <div className="flex flex-col gap-2 border-b border-border/40 pb-6">
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Sliders className="h-8 w-8 text-primary/80" />
                    Configurações
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl">
                    Gerencie parâmetros globais do sistema, regras financeiras e perfis de acesso.
                </p>
            </div>

            {/* --- NAVEGAÇÃO POR ABAS --- */}
            <Tabs defaultValue="general" className="space-y-6">

                <div className="flex items-center">
                    <TabsList className="bg-muted/50 p-1 border border-border/40 h-auto">
                        <TabsTrigger
                            value="general"
                            className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                            <Settings className="h-4 w-4" />
                            <span className="font-medium">Geral & Financeiro</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="access"
                            className="gap-2 px-6 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            <span className="font-medium">Perfis de Acesso</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* --- CONTEÚDO: GERAL --- */}
                <TabsContent value="general" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-4xl">
                        <GeneralSettingsForm />
                    </div>
                </TabsContent>

                {/* --- CONTEÚDO: ACESSOS (RBAC) --- */}
                <TabsContent value="access" className="space-y-4 focus-visible:ring-0 outline-none animate-in fade-in zoom-in-95 duration-300">
                    <div className="max-w-5xl">
                        <AccessControlTab />
                    </div>
                </TabsContent>

            </Tabs>

        </div>
    );
}