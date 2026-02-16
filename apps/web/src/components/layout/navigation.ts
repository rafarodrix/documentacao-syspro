import {
    LayoutDashboard,
    Users,
    FileText,
    Headset,
    Wrench,
    Scale,
    Settings,
    BookOpen,
    GraduationCap,
    Sparkles,
    Rocket,
    type LucideIcon,
} from "lucide-react";
import { hasPermission, hasAnyPermission } from "@cadens/core/rbac";
import type { Role } from "@cadens/core/permissions";

export type NavItem = {
    title: string;
    href: string;
    icon: LucideIcon;
};

export type NavGroup = {
    title: string;
    items: NavItem[];
};

/**
 * Constroi a navegacao do sidebar baseada no perfil do usuario.
 * Apenas os modulos que o usuario tem permissao sao exibidos.
 */
export function buildNavigationForRole(role: Role): NavGroup[] {
    const groups: NavGroup[] = [];

    // Grupo 1: Operacional (todos veem)
    const operationalItems: NavItem[] = [
        { title: "Dashboard", href: "/", icon: LayoutDashboard },
    ];

    // Cadastros - precisa de permissao
    if (hasAnyPermission(role, ["companies:view", "users:view"])) {
        operationalItems.push({ title: "Cadastros", href: "/cadastros", icon: Users });
    }

    // Contratos - precisa de permissao
    if (hasPermission(role, "contracts:view")) {
        operationalItems.push({ title: "Contratos", href: "/contratos", icon: FileText });
    }

    groups.push({ title: "Gerenciamento", items: operationalItems });

    // Grupo 2: Sistema
    const systemItems: NavItem[] = [
        { title: "Chamados", href: "/chamados", icon: Headset },
    ];

    // Ferramentas - precisa de permissao
    if (hasPermission(role, "tools:view")) {
        systemItems.push({ title: "Ferramentas", href: "/tools", icon: Wrench });
    }

    // Reforma Tributaria - precisa de permissao
    if (hasPermission(role, "tax_reform:view")) {
        systemItems.push({ title: "Reforma Tributaria", href: "/reforma-tributaria", icon: Scale });
    }

    // Configuracoes - precisa de permissao
    if (hasPermission(role, "settings:view")) {
        systemItems.push({ title: "Configuracoes", href: "/configuracoes", icon: Settings });
    }

    groups.push({ title: "Sistema", items: systemItems });

    // Grupo 3: Recursos (todos veem)
    groups.push({
        title: "Recursos",
        items: [
            { title: "Documentacao", href: "/docs/manual", icon: BookOpen },
            { title: "Duvidas", href: "/docs/duvidas", icon: GraduationCap },
            { title: "Releases", href: "/releases", icon: Rocket },
        ],
    });

    return groups;
}
