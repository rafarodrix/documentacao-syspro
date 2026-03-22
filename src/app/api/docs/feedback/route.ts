import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const slug = typeof body?.slug === 'string' ? body.slug : '';
    const title = typeof body?.title === 'string' ? body.title : '';
    const helpful = Boolean(body?.helpful);
    const reason = typeof body?.reason === 'string' ? body.reason : null;
    const votedAt = typeof body?.votedAt === 'string' ? body.votedAt : new Date().toISOString();

    console.info('[docs.feedback]', { slug, title, helpful, reason, votedAt });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[docs.feedback.error]', error);
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
