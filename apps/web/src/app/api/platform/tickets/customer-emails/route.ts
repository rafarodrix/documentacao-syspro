import { NextResponse } from "next/server";
import { getCustomerEmailOptionsForCurrentUser } from "@/features/tickets/application/customer-emails";

export async function GET(request: Request) {
  try {
    const result = await getCustomerEmailOptionsForCurrentUser(request.url);
    if (!result.authorized) {
      return NextResponse.json({ options: [] }, { status: 403 });
    }

    return NextResponse.json({ options: result.options });
  } catch (error) {
    console.error("customer-emails route error:", error);
    return NextResponse.json({ options: [] }, { status: 500 });
  }
}
