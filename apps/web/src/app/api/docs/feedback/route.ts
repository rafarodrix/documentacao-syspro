import { NextResponse } from "next/server";
import { submitDocsFeedback } from "@/features/docs/application/feedback";

export async function POST(request: Request) {
  try {
    const result = await submitDocsFeedback(request);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[docs.feedback.error]", error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
