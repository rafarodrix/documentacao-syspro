'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, Info } from 'lucide-react';
import type { SqlScript } from '@/lib/scripts';
import type { AdminDashboardStats } from '@/core/application/use-cases/dashboard-stats.use-case';
import { StatCard } from '@/components/admin/StatCard';
import { Clock, HelpCircle, AlertTriangle, Bug } from 'lucide-react';
import { motion } from 'framer-motion';

// --- Props do Componente Principal ---
interface AdminDashboardClientProps {
  stats: AdminDashboardStats;
  initialScripts: SqlScript[];
}

// --- Componente de Preview do Script ---
function ScriptCard({ script }: { script: SqlScript }) {
  return (
    <div className="p-3 border rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors">
      <h4 className="font-semibold text-sm truncate">{script.title}</h4>
      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
        <span className="bg-background px-2 py-0.5 rounded-full border">{script.category}</span>
        <span>- por {script.author}</span>
      </div>
    </div>
  );
}

// --- Componente Principal do Dashboard ---
export function AdminDashboardClient({ stats, initialScripts }: AdminDashboardClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');

  const categories = useMemo(() => ['Todas', ...new Set(initialScripts.map((s) => s.category))], [initialScripts]);
  const filteredScripts = useMemo(() => initialScripts.filter(script =>
    (category === 'Todas' || script.category === category) &&
    script.title.toLowerCase().includes(searchTerm.toLowerCase())
  ), [initialScripts, searchTerm, category]);

  // Animação para os containers
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  // Animação para os itens
  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-bold">Painel Interno</h1>
        <p className="text-muted-foreground">Recursos e ferramentas para a equipe.</p>
      </motion.div>

      <motion.section
        className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <StatCard title="Chamados Abertos" value={stats.chamadosAbertos} icon={<Clock className="w-5 h-5 text-muted-foreground" />} />
        <StatCard title="Chamados Novos" value={stats.chamadosNovos} icon={<HelpCircle className="w-5 h-5 text-blue-500" />} />
        <StatCard title="Aguardando Cliente" value={stats.aguardandoCliente} icon={<AlertTriangle className="w-5 h-5 text-amber-500" />} />
        <StatCard title="Bugs Críticos" value={stats.bugsCriticos} icon={<Bug className="w-5 h-5 text-red-500" />} />
      </motion.section>

      <motion.div
        className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="p-6 border rounded-xl bg-card shadow-sm flex flex-col">
          <h2 className="font-semibold text-lg">Consulta de Códigos</h2>
          <p className="text-sm text-muted-foreground flex-grow">Busque por códigos de erro ou funcionalidades.</p>
          <div className="mt-4 flex items-center gap-2 p-2 rounded-md bg-amber-500/10 text-amber-700 text-xs">
            <Info className="w-4 h-4 flex-shrink-0" />
            <span>Funcionalidade em desenvolvimento.</span>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 border rounded-xl bg-card shadow-sm">
          <h2 className="font-semibold text-lg mb-2">Scripts de Banco de Dados</h2>
          <p className="text-sm text-muted-foreground mb-4">Repositório de resoluções e scripts úteis.</p>
          {/* ... (lógica de busca e filtro) ... */}
          <div className="space-y-2">
            {filteredScripts.length > 0 ? (
              filteredScripts.slice(0, 3).map((script) => (
                <Link href="/admin/scripts" key={script.id} className="no-underline">
                  <ScriptCard script={script} />
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum script encontrado.</p>
            )}
          </div>
          <div className="mt-4 text-right">
            <Link href="/admin/scripts" className="text-sm text-primary hover:underline">Ver todos os scripts →</Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// --- Componente Skeleton para a experiência de carregamento ---
export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto py-8 px-4 animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
      <div className="h-4 bg-muted rounded w-1/3"></div>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="h-24 bg-card border rounded-xl"></div>
        <div className="h-24 bg-card border rounded-xl"></div>
        <div className="h-24 bg-card border rounded-xl"></div>
        <div className="h-24 bg-card border rounded-xl"></div>
      </div>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-48 bg-card border rounded-xl"></div>
        <div className="h-48 bg-card border rounded-xl"></div>
      </div>
    </div>
  );
}