import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    return NextResponse.json({ message: "A ROTA EXISTE! O Better Auth não foi chamado." });
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    console.log("Recebi um POST em:", req.url);
    console.log("Corpo:", body);

    return NextResponse.json({
        message: "POST recebido com sucesso!",
        receivedBody: body
    });
}