import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

export async function GET() {
  const checks = {
    backendApiBaseUrl: hasValue(process.env.APP_BACKEND_API_URL) || hasValue(process.env.APP_BACKEND_API) || hasValue(process.env.APP_API_URL),
    internalApiKey: hasValue(process.env.INTERNAL_API_KEY),
    authSecret: hasValue(process.env.BETTER_AUTH_SECRET),
    publicAppUrl: hasValue(process.env.NEXT_PUBLIC_APP_URL) || hasValue(process.env.NEXT_PUBLIC_WEB_URL),
  };

  const ok = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      success: ok,
      data: {
        app: "web",
        status: ok ? "ok" : "degraded",
        checks,
        timestamp: new Date().toISOString(),
      },
    },
    { status: ok ? 200 : 503 },
  );
}
