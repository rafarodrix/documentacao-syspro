import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Busca o usuário diretamente, ignorando o Better Auth
        const user = await prisma.user.findUnique({
            where: { email: "rafaelrodrix@icloud.com" },
        });

        if (!user) {
            return NextResponse.json({ status: "error", message: "Usuário não encontrado no banco." });
        }

        return NextResponse.json({
            status: "success",
            user_id: user.id,
            email: user.email,
            // Verifica se o campo password tem valor (retorna o tamanho ou null)
            has_password: !!user.password,
            password_length: user.password ? user.password.length : 0,
            role: user.role
        });

    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message });
    }
}