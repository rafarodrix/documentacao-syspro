import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";
import { currentUserHasPermission } from "@/features/user-access/application/current-user-access";

export async function GET() {
  const session = await getProtectedSession();

  if (!session) {
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
    {
      role: session.role,
      userId: session.userId,
      permissions: {
        canManageTools: await currentUserHasPermission("tools:all"),
        canEditSettings: await currentUserHasPermission("settings:edit"),
        canManageTax: await currentUserHasPermission("tax_reform:manage"),
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=15",
        "x-session-role": session.role,
      },
    },
  );
}
