"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Building2,
    Users,
    Settings,
    FileText,
    LifeBuoy,
    LogOut
} from "lucide-react";
import { authClient } from "@/lib/auth-client"; // Client do Better Auth
import { useRouter } from "next/navigation";

const navItems = [
    { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { title: "Empresas", href: "/admin/empresas", icon: Building2 },
    { title: "Usuários", href: "/admin/usuarios", icon: Users },
    { title: "Logs do Sistema", href: "/admin/logs", icon: FileText },
    { title: "Configurações", href: "/admin/configuracoes", icon: Settings },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await authClient.signOut();
        router.push("/login");
    };

    return (
        <div className="hidden border-r bg-muted/40 md:block md:w-64 lg:w-72 h-screen sticky top-0">
            <div className="flex h-full max-h-screen flex-col gap-2">

                {/* Logo Area */}
                <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <LifeBuoy className="h-6 w-6 text-primary" />
                        <span className="">Trilink Admin</span>
                    </Link>
                </div>

                {/* Navigation Links */}
                <div className="flex-1 overflow-auto py-2">
                    <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                                        isActive
                                            ? "bg-muted text-primary font-semibold"
                                            : "text-muted-foreground"
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Footer / Logout */}
                <div className="mt-auto p-4 border-t">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                        <LogOut className="h-4 w-4" />
                        Sair do Sistema
                    </button>
                </div>
            </div>
        </div>
    );
}