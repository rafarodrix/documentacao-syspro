import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import ZammadChat from '@/components/chat/ZammadChat';

export async function ConditionalChat() {
  const session = await getServerSession(authOptions);

  if (!session?.user) return null;

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
      <ZammadChat
        scriptSrc="https://suporte.trilinksoftware.com.br/assets/chat/chat-no-jquery.min.js"
        chatOptions={{
          chatId: 1,
        }}
        userName={session.user.name}
        userEmail={session.user.email}
        buttonText="Posso Ajudar?"
        className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      />
    </div>
  );
}