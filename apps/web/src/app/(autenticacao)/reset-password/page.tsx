import { Suspense } from "react"
import { ResetPasswordForm } from "@/components/auth/reset-password-form"
import { Loader2 } from "lucide-react"
import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Redefinir Senha | Syspro ERP",
    description: "Crie uma nova senha.",
}

export default function ResetPasswordPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            }
        >
            <ResetPasswordForm />
        </Suspense>
    )
}