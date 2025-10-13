// Em types/zammat.d.ts

// Interface opcional para definir as opções de forma mais clara
interface ZammadChatOptions {
  title?: string;
  fontSize?: string;
  chatId?: number;
  show?: boolean;
  // Adicione outras propriedades que você usa
}

// Agora, estendemos a interface global do Window com a definição CORRETA
declare global {
  interface Window {
    // Esta é a definição correta: um construtor de classe.
    ZammadChat?: new (options: ZammadChatOptions) => {
      open: () => void;
      close: () => void;
      on: (event: string, callback: () => void) => void;
      off: (event: string, callback: () => void) => void;
    };
  }
}

// Este export vazio é importante para que o arquivo seja tratado como um módulo.
export {};