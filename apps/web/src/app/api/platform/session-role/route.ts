import { NextResponse } from "next/server";
import { getProtectedSession } from "@/lib/auth-helpers";

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
