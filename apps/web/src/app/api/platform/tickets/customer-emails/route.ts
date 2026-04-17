import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getCustomerEmailOptionsForCurrentUser } from "@/features/tickets/application/customer-emails";

function isDatabaseConnectionError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "PrismaClientInitializationError" ||
    error.message.includes("Authentication failed against database server") ||
    error.message.includes("ECIRCUITBREAKER") ||
    error.message.includes("Error querying the database")
  );
}

export async function GET(request: Request) {
  try {
    const result = await getCustomerEmailOptionsForCurrentUser(request.url);
    if (!result.authorized) {
      return NextResponse.json({ options: [] }, { status: 403 });
    }

    return NextResponse.json({ options: result.options });
  } catch (error) {
    console.error("customer-emails route error:", error);
    if (isDatabaseConnectionError(error)) {
      return NextResponse.json(
        {
          options: [],
          error: "Banco de dados indisponivel ou credenciais invalidas em producao.",
          code: "DATABASE_UNAVAILABLE",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ options: [], error: "Falha ao consultar empresas." }, { status: 500 });
  }
}
