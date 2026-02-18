// api/scripts/route.ts
import { NextResponse } from 'next/server';
import { getSqlScripts } from '@/lib/scripts';

export async function GET() {
  // Mesmo que getSqlScripts agora seja síncrona, mantemos a rota como async
  // por padrão e para futuras expansões. O 'await' não é mais necessário aqui.
  const scripts = getSqlScripts(); 
  return NextResponse.json(scripts);
}