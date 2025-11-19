import type { ReactNode } from "react";
import { Info, XCircle, AlertTriangle, CheckCircle } from "lucide-react";

interface AlertProps {
    variant?: "info" | "danger" | "warning" | "success";
    title?: string;
    children: ReactNode;
}

// Configuração de variantes com o novo estilo (borda lateral)
const variantConfig = {
    info: {
        icon: <Info className="h-5 w-5 text-blue-600" />,
        classes: "border-blue-500 bg-blue-500/10",
    },
    danger: {
        icon: <XCircle className="h-5 w-5 text-red-600" />,
        classes: "border-red-500 bg-red-500/10",
    },
    warning: {
        icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
        classes: "border-amber-500 bg-amber-500/10",
    },
    success: {
        icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
        classes: "border-emerald-500 bg-emerald-500/10",
    },
};

export function Alert({
    variant = "info",
    title,
    children,
}: AlertProps) {
    const config = variantConfig[variant];

    return (
        <div
            className={`my-4 flex items-start gap-4 rounded-lg border-l-4 p-4 ${config.classes}`}
        >
            <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
            <div className="flex-grow">
                {/* Renderiza o título apenas se ele for fornecido */}
                {title && <p className="font-semibold text-foreground">{title}</p>}
                <div className="text-sm prose-p:my-1 text-muted-foreground">{children}</div>
            </div>
        </div>
    );
}



/*
Modo de uso do componente Alert:

import { Alert } from '@/components/ui/Alert';

<Alert title="Com Título">
  <p>Este alerta tem um título explícito.</p>
</Alert>

<Alert variant="warning">
  <p>Este alerta não tem um título, apenas o conteúdo principal.</p>
</Alert>
*/