import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { getProtectedSession } from "@/lib/auth-helpers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { buildNavigationForRole } from "@/components/layout/navigation";
import { PlatformSidebar } from "@/components/layout/PlatformSidebar";
import { PlatformHeader } from "@/components/layout/PlatformHeader";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Role } from "@cadens/core/permissions";

export default async function PlatformLayout({
    children,
}: {
    children: ReactNode;
}) {
    // 1. Verificacao de Sessao
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const role = session.role as Role;
    const isInternalUser = ["ADMIN", "DEVELOPER", "SUPORTE"].includes(role);

    // 2. Constroi navegacao baseada no perfil do usuario
    const navigation = buildNavigationForRole(role);

    // 3. Dados do Usuario para Sidebar/Header
    const userForLayout = {
        name: (session as any).name || session.email.split("@")[0] || "Usuario",
        email: session.email,
        image: (session as any).image || null,
        role: session.role,
    };

    return (
        <TooltipProvider>
            <div className="flex h-screen w-full bg-muted/5 overflow-hidden">
                {/* --- SIDEBAR DESKTOP (Fixa) --- */}
                <aside className="hidden md:flex w-72 flex-col fixed inset-y-0 z-50 border-r bg-background">
                    <PlatformSidebar user={userForLayout} navigation={navigation} />
                </aside>

                {/* --- AREA PRINCIPAL --- */}
                <div className="flex-1 flex flex-col md:pl-72 transition-all duration-300 ease-in-out h-full">
                    {/* HEADER (Mobile + Desktop) */}
                    <header className="sticky top-0 z-40 w-full bg-background/80 backdrop-blur-md border-b border-border/40 h-16 flex items-center px-4 sm:px-6 justify-between">
                        {/* Mobile: Botao Menu */}
                        <div className="md:hidden flex items-center">
                            <Sheet>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-ml-2">
                                        <Menu className="h-6 w-6" />
                                        <span className="sr-only">Abrir menu</span>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-72">
                                    <PlatformSidebar user={userForLayout} navigation={navigation} mobile />
                                </SheetContent>
                            </Sheet>

                            {/* Logo Mobile */}
                            <Link href="/dashboard" className="ml-2 font-bold text-lg truncate flex items-center gap-2">
                                {isInternalUser ? (
                                    <>
                                        <ShieldCheck className="h-5 w-5 text-purple-600" />
                                        Trilink<span className="text-purple-600">Admin</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-5 w-5 text-primary" />
                                        <span>Portal</span>
                                    </>
                                )}
                            </Link>
                        </div>

                        {/* Desktop/Mobile: Header Actions */}
                        <div className="flex flex-1 justify-end md:justify-between items-center">
                            <PlatformHeader user={userForLayout} />
                        </div>
                    </header>

                    {/* CONTEUDO SCROLLAVEL */}
                    <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
                        <div className="max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </TooltipProvider>
    );
}
