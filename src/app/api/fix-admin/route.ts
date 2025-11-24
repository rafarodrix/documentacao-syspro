import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const email = "rafaelrodrix@icloud.com";
        const newPassword = "Trilink098"; // <--- Sua nova senha aqui

        console.log("🔄 Iniciando processo de correção do Admin...");

        // 1. Removemos o usuário "quebrado" (com hash incorreto)
        // Precisamos deletar para o Better Auth poder criar do zero com a criptografia dele
        const deleted = await prisma.user.deleteMany({
            where: { email: email }
        });

        console.log(`🗑️ Usuário antigo removido: ${deleted.count}`);

        // 2. Usamos o Better Auth para criar o usuário novamente.
        // AQUI É O PULO DO GATO: O Better Auth vai gerar o hash compatível automaticamente.
        const newUser = await auth.api.signUpEmail({
            body: {
                email,
                password: newPassword,
                name: "Super Admin",
            }
        });

        if (!newUser) {
            return NextResponse.json({ status: "error", message: "Falha ao recriar usuário no Better Auth." }, { status: 500 });
        }

        // 3. Devolvemos as permissões de ADMIN/DEVELOPER
        // (O signUp cria como USER padrão, então precisamos promover manualmente)
        await prisma.user.update({
            where: { email },
            data: {
                role: "DEVELOPER",
                emailVerified: true,
                isActive: true
            }
        });

        return NextResponse.json({
            status: "success",
            message: "✅ Admin recriado com sucesso! A senha agora é criptografada corretamente.",
            email: email,
            senha_definida: newPassword
        });

    } catch (error: any) {
        return NextResponse.json({ status: "error", error: error.message }, { status: 500 });
    }
}