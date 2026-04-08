import { NextResponse } from "next/server";
import { resolveRustdeskDeepLink } from "@/features/remote/application/ticket-integration";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await context.params;
  const { searchParams } = new URL(request.url);

  const result = await resolveRustdeskDeepLink({
    ticketId,
    customerEmail: searchParams.get("customerEmail"),
    rustdeskId: searchParams.get("rustdeskId"),
  });

  if (!result) {
    return NextResponse.json({ success: false, error: "Deep-link RustDesk nao resolvido para o ticket." }, { status: 404 });
  }

  if (searchParams.get("redirect") === "1") {
    return new Response(null, {
      status: 307,
      headers: {
        Location: result.deepLink,
      },
    });
  }

  return NextResponse.json({ success: true, data: result });
}
