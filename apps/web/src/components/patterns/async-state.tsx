import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle, Button } from "@dosc-syspro/ui";
import { cn } from "@/lib/utils";

export function LoadingState({
  label = "Carregando...",
  compact = false,
  className,
}: {
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center text-muted-foreground",
        compact ? "py-4" : "p-12",
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Nao foi possivel carregar os dados",
  description,
  action,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)}>
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-500">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-foreground">{title}</h2>
      {description ? <p className="mb-6 max-w-md text-muted-foreground">{description}</p> : null}
      {action ? (
        <Button variant="outline" className="gap-2" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function StaleState({
  title = "Dados em modo contingencia",
  message,
  className,
}: {
  title?: string;
  message: ReactNode;
  className?: string;
}) {
  return (
    <Alert className={cn("border-amber-500/30 bg-amber-500/10 text-amber-900", className)}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
