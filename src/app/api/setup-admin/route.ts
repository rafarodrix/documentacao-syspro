import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const email = "rafaelrodrix@icloud.com";
        const password = "123456"; // A senha que você quer

        // 1. Primeiro, vamos limpar o usuário 'quebrado' que criamos via seed
        // para o Better Auth criar um novo do zero, do jeito dele.
        await prisma.user.deleteMany({
            where: { email: email }
        });

        // 2. Usamos a API interna do Better Auth para criar o usuário.
        // Isso garante que a senha seja criptografada corretamente (Scrypt/Argon2).
        const user = await auth.api.signUpEmail({
            body: {
                email,
                password,
                name: "Super Admin",
            }
        });

        if (!user) {
            return NextResponse.json({ status: "error", message: "Falha ao criar usuário." });
        }

        // 3. Forçamos a role para DEVELOPER manualmente no banco
        // (pois o signUpEmail cria como USER padrão)
        await prisma.user.update({
            where: { email },
            data: {
                role: "DEVELOPER",
                emailVerified: true
            }
        });

        return NextResponse.json({
            status: "success",
            message: "Admin recriado com sucesso! Agora o login vai funcionar.",
            user
        });

    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}