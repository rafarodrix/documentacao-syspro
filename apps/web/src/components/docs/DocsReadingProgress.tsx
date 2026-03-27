'use client';

import { useEffect, useState } from 'react';

function calcProgress() {
  if (typeof window === 'undefined') return 0;
  const article = document.querySelector('#nd-page article');
  if (!article) return 0;

  const rect = article.getBoundingClientRect();
  const articleTop = rect.top + window.scrollY;
  const articleHeight = article.scrollHeight;
  const viewportHeight = window.innerHeight;
  const maxScrollable = Math.max(articleHeight - viewportHeight, 1);
  const scrolled = window.scrollY - articleTop;
  const ratio = Math.min(1, Math.max(0, scrolled / maxScrollable));

  return ratio;
}

export function DocsReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => setProgress(calcProgress());
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-[calc(var(--fd-banner-height)+var(--fd-nav-height))] z-[60] h-[2px] bg-transparent md:top-0"
    >
      <div
        className="h-full bg-linear-to-r from-primary/40 via-primary to-primary/40 transition-[width] duration-150"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  );
}
