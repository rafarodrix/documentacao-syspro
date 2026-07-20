"use client";

import { AlertCircle, CheckCircle2, HelpCircle, XCircle, Loader2, Ban } from "lucide-react";
import type { HealthStatus } from "../types/device-service.types";

export function ServiceStatus({ healthStatus }: { healthStatus: HealthStatus }) {
  switch (healthStatus) {
    case "HEALTHY":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "WARNING":
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case "CRITICAL":
      return <XCircle className="h-4 w-4 text-destructive" />;
    case "UPDATING":
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case "DISABLED":
      return <Ban className="h-4 w-4 text-muted-foreground" />;
    case "UNKNOWN":
    default:
      return <HelpCircle className="h-4 w-4 text-muted-foreground" />;
  }
}
