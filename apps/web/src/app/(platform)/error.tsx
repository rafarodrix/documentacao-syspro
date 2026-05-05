"use client";

import { useEffect } from "react";
import { ProtectedRouteError } from "@/components/platform/shared/protected-route-error";

export default function PlatformError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Platform route error:", error);
  }, [error]);

  return <ProtectedRouteError onRetry={reset} />;
}

