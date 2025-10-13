'use client';

import Script from 'next/script';
import { useState, useEffect, useMemo, type FC } from 'react';


// Opções que o construtor do ZammadChat aceita
interface ZammadChatOptions {
  chatId: number;
  show?: boolean;
  title?: string;
  fontSize?: string;
  locale?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

// Props do nosso componente React aprimorado
interface ZammadChatProps {
  scriptSrc: string;
  chatOptions: Omit<ZammadChatOptions, 'firstName' | 'lastName' | 'email'>;
  userName?: string | null;
  userEmail?: string | null;
  buttonText?: string;
  className?: string;
}

const ZammadChat: FC<ZammadChatProps> = ({
  scriptSrc,
  chatOptions,
  userName,
  userEmail,
  buttonText = 'Ajuda?',
  className = '',
}) => {
  const [isButtonVisible, setIsButtonVisible] = useState(true);
  const [chatInstance, setChatInstance] = useState<InstanceType<NonNullable<Window['ZammadChat']>> | null>(null);

  const finalOptions = useMemo(() => {
    const nameParts = userName?.split(' ') || [];
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';

    return {
      ...chatOptions,
      show: false,
      firstName: firstName,
      lastName: lastName,
      email: userEmail || undefined,
    };
  }, [chatOptions, userName, userEmail]);

  useEffect(() => {
    if (!window.ZammadChat || chatInstance) return;

    try {
      const instance = new window.ZammadChat(finalOptions);
      setChatInstance(instance);

      const handleChatClose = () => {
        setIsButtonVisible(true);
      };

      instance.on('chat:close', handleChatClose);

      return () => {
        instance.off('chat:close', handleChatClose);
      };

    } catch (error) {
      console.error('🔥 Zammad Script: Erro durante a inicialização:', error);
    }
  }, [chatInstance, finalOptions]);


  const handleOpenChat = () => {
    if (chatInstance) {
      chatInstance.open();
      setIsButtonVisible(false);
    } else {
      console.error('❌ Instância do Zammad Chat não foi encontrada! O script pode ter falhado ao carregar.');
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
        id="zammad-chat-script"
        src={scriptSrc}
        strategy="lazyOnload"
      />
    </>
  );
};

export default ZammadChat;