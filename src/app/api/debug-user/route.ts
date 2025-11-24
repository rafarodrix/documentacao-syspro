import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Tenta encontrar o usuário admin
    const user = await prisma.user.findUnique({
      where: { email: "rafaelrodrix@icloud.com" },
      select: {
        id: true,
        email: true,
        role: true,
        password: true, // Vamos ver se a senha existe (retornará o hash)
      }
    });

    if (!user) {
      return NextResponse.json({ 
        status: "error", 
        message: "Usuário NÃO encontrado no banco conectado." 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      status: "success", 
      message: "Usuário encontrado!",
      data: {
        ...user,
        hasPassword: !!user.password, // Retorna true se tiver senha
        passwordStart: user.password ? user.password.substring(0, 10) + "..." : "NULL"
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      status: "error", 
      message: error.message 
    }, { status: 500 });
  }
}