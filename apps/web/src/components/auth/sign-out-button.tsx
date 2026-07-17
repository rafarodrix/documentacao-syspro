"use client"

import { authClient } from "@/lib/auth-client"
import { useRouter } from "next/navigation"
import { DropdownMenuItem, Button } from "@dosc-syspro/ui"
import { LogOut } from "lucide-react"

export function SignOutButton({ mobile = false }: { mobile?: boolean }) {
    const router = useRouter()

    const handleSignOut = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push("/login")
                    router.refresh() // Atualiza a UI do header
                },
            },
        })
    }

    if (mobile) {
        // ds-allow: status
        return (
            <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50" onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sair da Conta
            </Button>
        )
    }

    // ds-allow: status
    return (
        <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
        </DropdownMenuItem>
    )
}
