// components/admin/StatCard.tsx
'use client';

import { motion } from 'framer-motion';

// Variantes de animação para o card individual (para consistência com o dashboard)
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  description?: string;
}

export function StatCard({ title, value, icon, description }: StatCardProps) {
  return (

    <motion.div variants={itemVariants}>
      <div className="p-4 flex flex-col justify-between h-full border rounded-xl bg-card text-card-foreground shadow-sm">
        
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          {icon}
        </div>

        <div className="mt-2">
          <p className="text-3xl font-bold">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>

      </div>
    </motion.div>
  );
}