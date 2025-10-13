// --- Imports ---
import { HeroSection } from '@/components/home/HeroSection';
import { ResourceCards } from '@/components/ResourceCards';
import { ReleaseNotesSection } from '@/components/home/ReleaseNotesSection';
import { ContactSection } from '@/components/home/ContactSection';

// Revalidação da página
export const revalidate = 3600; // 1 hora

// --- Componente da Página ---
export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center p-6 md:p-12">
      
      <HeroSection />

      <div className="w-full max-w-5xl mb-12 md:mb-20">
        <ResourceCards />
      </div>

      <ReleaseNotesSection />
      
      <ContactSection />

    </main>
  );
}