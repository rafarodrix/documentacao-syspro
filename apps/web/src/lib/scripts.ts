import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import matter from 'gray-matter';

// --- Esquema de Validação do Frontmatter ---
const ScriptFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  author: z.string(),
  createdAt: z.string(),
  firebirdVersion: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// --- Tipo e Função para Buscar Scripts ---
export type SqlScript = z.infer<typeof ScriptFrontmatterSchema> & {
  sql: string;
};

// Função para ler os arquivos MDX e extrair os scripts SQL
export function getSqlScripts(): SqlScript[] {
  const scriptsDir = path.join(process.cwd(), 'data/scripts');

  try {
    if (!fs.existsSync(scriptsDir)) {
      console.warn('Diretório de scripts não encontrado em:', scriptsDir);
      return [];
    }
    
    const filenames = fs.readdirSync(scriptsDir);

    const scripts = filenames
      .filter((f) => f.endsWith('.mdx'))
      .map((filename) => {
        const filePath = path.join(scriptsDir, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const { data, content } = matter(fileContent);
        
        const sqlMatch = content.match(/```sql([\s\S]*?)```/);
        
        const sql = sqlMatch ? sqlMatch[1].trim() : '-- Script SQL não encontrado --';
        
        const frontmatter = ScriptFrontmatterSchema.parse(data);
        
        return { ...frontmatter, sql };
      });

    return scripts;
  } catch (error) {
    console.error('Ocorreu um erro ao processar os scripts:', error);
    return [];
  }
}