import { NextResponse } from 'next/server';
// 1. Importe o revalidateTag
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  const secret = searchParams.get('secret');
  if (secret !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const ticketId = body.ticket_id;

    if (!ticketId) {
      return NextResponse.json({ message: 'Ticket ID not found in payload' }, { status: 400 });
    }
    
    console.log(`Gatilho de revalidação recebido para o Ticket ID: ${ticketId}`);

    // 2. Invalide o cache de DADOS com a tag
    revalidateTag('releases');

    // 3. Revalide os caminhos das PÁGINAS
    revalidatePath('/docs/suporte/releasenotes');
    revalidatePath('/api/releases'); // Manter por segurança

    const revalidatedPaths = ['/docs/suporte/releasenotes', '/api/releases'];
    console.log('Cache de dados (tag: releases) e caminhos revalidados com sucesso:', revalidatedPaths);

    return NextResponse.json({ revalidated: true, paths: revalidatedPaths, now: Date.now() });

  } catch (err) {
    console.error('Erro ao revalidar cache:', err);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}