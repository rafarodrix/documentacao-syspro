import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CadastrosSistemaEditarPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/portal/cadastros/usuarios/${id}/editar`);
}
