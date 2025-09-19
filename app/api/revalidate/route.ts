import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Esta rota receberá as chamadas do Zammad com uma carga útil (payload)
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);

  // 1. Valida o token secreto da URL
  const secret = searchParams.get('secret');
  if (secret !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json({ message: 'Invalid token' }, { status: 401 });
  }

  try {
    // 2. Lê o corpo da requisição para obter o ID do ticket
    const body = await request.json();
    const ticketId = body.ticket_id;

    if (!ticketId) {
      return NextResponse.json({ message: 'Ticket ID not found in payload' }, { status: 400 });
    }
    
    console.log(`Gatilho de revalidação recebido para o Ticket ID: ${ticketId}`);

    // 3. Revalida os caminhos principais. 
    // A página de índice é a mais importante para ser atualizada.
    revalidatePath('/docs/suporte/releasenotes');
    revalidatePath('/api/releases');

    const revalidatedPaths = ['/docs/suporte/releasenotes', '/api/releases'];

    console.log('Cache revalidado com sucesso para:', revalidatedPaths);

    return NextResponse.json({ revalidated: true, paths: revalidatedPaths, now: Date.now() });

  } catch (err) {
    console.error('Erro ao revalidar cache:', err);
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}