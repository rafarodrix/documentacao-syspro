// Componente de carregamento para a página de lançamentos
// Mostra um esqueleto de carregamento enquanto os dados são buscados

import { ReleasesIndexSkeleton } from '@/components/releases/ReleasesSkeleton';

export default function Loading() {
  return <ReleasesIndexSkeleton />;
}