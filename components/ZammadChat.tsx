'use client';

import Script from 'next/script';
import { useState, useEffect, type FC } from 'react';

declare global {
  interface Window {
    // @ts-ignore — Ignora o erro de tipo conflitante da biblioteca fumadocs
    ZammadChat?: new (options: any) => any;
    zammadChat?: {
      open: () => void;
      close: () => void;
    };
  }
}

interface ZammadChatOptions {
  chatId: number;
  show?: boolean;
  host?: string;
  debug?: boolean;
  title?: string;
  fontSize?: string;
  flat?: boolean;
  locale?: string;
}

interface ZammadChatProps {
  scriptSrc: string;
  chatOptions: ZammadChatOptions;
  buttonText?: string;
  className?: string;
}

const ZammadChat: FC<ZammadChatProps> = ({
  scriptSrc,
  chatOptions,
  buttonText = 'Ajuda?',
  className = '',
}) => {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [chatInstance, setChatInstance] = useState<any>(null);

 useEffect(() => {
    if (!isScriptLoaded || !window.ZammadChat) return;

    const finalOptions = {
      show: false,
      ...chatOptions,
    };

    try {
      // A SOLUÇÃO É ADICIONAR ESTA LINHA ABAIXO
      // @ts-ignore — Ignora o erro de "construct signature" no momento do uso.
      const instance = new window.ZammadChat(finalOptions);
      setChatInstance(instance);
    } catch (error) {
      console.error('🔥 Zammad Script: Erro durante a inicialização:', error);
    }
  }, [isScriptLoaded, chatOptions]);

  const handleOpenChat = () => {
    // Usa a instância guardada para abrir o chat
    if (chatInstance) {
      chatInstance.open();
      setIsButtonVisible(false);
    } else {
      console.error('❌ Instância do Zammad Chat não foi encontrada!');
    }
  };

  return (
    <>
      {isButtonVisible && (
        <button onClick={handleOpenChat} className={className}>
          {buttonText}
        </button>
      )}

      <Script
        src={scriptSrc}
        strategy="afterInteractive"
        onLoad={() => {
          setIsScriptLoaded(true);
        }}
      />
    </>
  );
};

export default ZammadChat;