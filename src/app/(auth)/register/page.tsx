import { RegisterForm } from "@/components/auth/register-form";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Criar Conta | Syspro ERP",
    description: "Crie sua conta de colaborador para acessar o Syspro ERP.",
};

export default function RegisterPage() {
    return <RegisterForm />;
}