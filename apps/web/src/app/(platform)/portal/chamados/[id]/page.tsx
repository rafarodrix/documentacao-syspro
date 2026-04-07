import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChamadosTicketRedirectPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/portal/tickets/${id}`);
}
