import { ImageResponse } from 'next/og';

export const runtime = 'edge';

function decodeSlugParam(value: string | null): string {
  if (!value) return 'inicio';
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function formatSlugTitle(slug: string): string {
  if (!slug || slug === 'inicio') return 'Central de Documentacao';
  const last = slug.split('/').filter(Boolean).pop() ?? slug;
  return last
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = decodeSlugParam(searchParams.get('slug'));
  const title = formatSlugTitle(slug);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 56,
          background: 'linear-gradient(135deg, #05070b 0%, #0f172a 100%)',
          color: '#f8fafc',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              fontSize: 22,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
              opacity: 0.9,
            }}
          >
            Syspro ERP · Docs
          </div>
          <div style={{ fontSize: 60, lineHeight: 1.1, fontWeight: 700, maxWidth: 980 }}>
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, opacity: 0.88 }}>
          <span>/docs/{slug === 'inicio' ? '' : slug}</span>
          <span>Trilink Softwares</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
