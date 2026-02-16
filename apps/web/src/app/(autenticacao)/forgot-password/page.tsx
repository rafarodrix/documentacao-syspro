import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Recuperar Senha | Syspro ERP",
    description: "Solicite a redefinição da sua senha de acesso.",
};

export default function ForgotPasswordPage() {
    return <ForgotPasswordForm />;
}