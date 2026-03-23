'use client';

import { useEffect } from 'react';

function isHeadingElement(el: Element): el is HTMLElement {
  return /^H[1-6]$/.test(el.tagName);
}

export function DocsTocScrollSpy() {
  useEffect(() => {
    const headings = Array.from(document.querySelectorAll('article :is(h1,h2,h3,h4,h5,h6)[id]')).filter(isHeadingElement);
    if (headings.length === 0) return;

    const tocLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('#nd-toc a[href^="#"], [data-toc-popover] a[href^="#"]'),
    );
    if (tocLinks.length === 0) return;

    const linkMap = new Map<string, HTMLAnchorElement[]>();
    for (const link of tocLinks) {
      const hash = link.getAttribute('href');
      if (!hash) continue;
      const list = linkMap.get(hash) ?? [];
      list.push(link);
      linkMap.set(hash, list);
    }

    const setActive = (id: string) => {
      for (const links of linkMap.values()) {
        for (const link of links) {
          link.removeAttribute('data-active');
          link.removeAttribute('aria-current');
          link.classList.remove('text-fd-primary', 'font-semibold');
        }
      }
      const target = linkMap.get(`#${id}`);
      if (!target) return;
      for (const link of target) {
        link.setAttribute('data-active', 'true');
        link.setAttribute('aria-current', 'true');
        link.classList.add('text-fd-primary', 'font-semibold');
      }
    };

    const ratios = new Map<string, number>();
    let currentId = headings[0].id;
    setActive(currentId);

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).id;
          ratios.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        let nextId = currentId;
        let maxRatio = 0;

        for (const heading of headings) {
          const ratio = ratios.get(heading.id) ?? 0;
          if (ratio >= maxRatio) {
            maxRatio = ratio;
            nextId = heading.id;
          }
        }

        if (nextId !== currentId) {
          currentId = nextId;
          setActive(currentId);
        }
      },
      {
        rootMargin: '-15% 0px -65% 0px',
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return null;
}
