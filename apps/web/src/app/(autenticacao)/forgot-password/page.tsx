import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Recuperar Senha | Syspro ERP",
    description: "Solicite a redefiniÃ§Ã£o da sua senha de acesso.",
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}
