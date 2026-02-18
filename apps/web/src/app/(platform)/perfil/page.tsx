import { getProtectedSession } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UserProfileSettings } from "@/components/platform/shared/UserProfileSettings";
import { redirect } from "next/navigation";

export default async function PerfilPage() {
    const session = await getProtectedSession();
    if (!session) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
            name: true,
            email: true,
            image: true,
            role: true,
        },
    });

    if (!user) return <div>Usuario nao encontrado.</div>;

    const userData = {
        name: user.name || "Usuario",
        email: user.email,
        image: user.image,
        role: user.role,
        twoFactorEnabled: false,
    };

    return <UserProfileSettings user={userData} />;
}
