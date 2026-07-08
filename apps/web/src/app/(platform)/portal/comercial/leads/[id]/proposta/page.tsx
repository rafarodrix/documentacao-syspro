"use client";

import { use } from "react";
import { ProposalBuilderForm } from "@/features/crm/interface/proposal-builder-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ProposalBuilderPage({ params }: PageProps) {
  const { id } = use(params);
  return <ProposalBuilderForm leadId={id} />;
}
