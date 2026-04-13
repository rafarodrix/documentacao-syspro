import { NextResponse } from "next/server";
import { getCurrentSessionRoleView } from "@/features/user-access/application/session-role";

export async function GET() {
  const sessionRoleView = await getCurrentSessionRoleView();

  if (!sessionRoleView) {
    return NextResponse.json(
      { role: null },
      {
        status: 401,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  }

  return NextResponse.json(
    sessionRoleView,
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=15",
        "x-session-role": sessionRoleView.role,
      },
    },
  );
}
