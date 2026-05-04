'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';

const CHATWOOT_BASE_URL = 'https://chat.trilinksoftware.com.br';
const CHATWOOT_WEBSITE_TOKEN = 'FDDWn82o1Q7Yfs2czgx9dfWJ';
const CHATWOOT_SCRIPT_ID = 'chatwoot-sdk';

declare global {
  interface Window {
    chatwootSDK?: {
      run: (config: { websiteToken: string; baseUrl: string }) => void;
    };
    chatwootSettings?: {
      position?: 'left' | 'right';
      type?: 'standard' | 'expanded_bubble';
      launcherTitle?: string;
      hideMessageBubble?: boolean;
    };
    $chatwoot?: {
      toggle: (state?: 'open' | 'close') => void;
    };
  }
}

export function ChatwootLazyLauncher() {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const handleReady = () => {
      setIsReady(true);
      setIsLoading(false);
      window.$chatwoot?.toggle('open');
    };

    window.addEventListener('chatwoot:ready', handleReady);
    return () => window.removeEventListener('chatwoot:ready', handleReady);
  }, []);

  const openChat = useCallback(() => {
    if (isReady) {
      window.$chatwoot?.toggle('open');
      return;
    }

    setIsLoading(true);
    window.chatwootSettings = {
      position: 'right',
      type: 'standard',
      launcherTitle: '',
      hideMessageBubble: true,
    };

    if (window.chatwootSDK) {
      window.chatwootSDK.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      });
      return;
    }

    const existingScript = document.getElementById(CHATWOOT_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) return;

    const script = document.createElement('script');
    script.id = CHATWOOT_SCRIPT_ID;
    script.src = `${CHATWOOT_BASE_URL}/packs/js/sdk.js`;
    script.async = true;
    script.onload = () => {
      window.chatwootSDK?.run({
        websiteToken: CHATWOOT_WEBSITE_TOKEN,
        baseUrl: CHATWOOT_BASE_URL,
      });
    };
    script.onerror = () => {
      setIsLoading(false);
    };
    document.body.appendChild(script);
  }, [isReady]);

  return (
    <button
      type="button"
      onClick={openChat}
      disabled={isLoading}
      className="fixed bottom-5 right-5 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-black/20 transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
      aria-label="Iniciar atendimento"
    >
      <MessageCircle className="h-5 w-5" aria-hidden="true" />
      <span>{isLoading ? 'Abrindo...' : 'Atendimento'}</span>
    </button>
  );
}
