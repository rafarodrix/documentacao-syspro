
import fs from 'fs'; 
import path from 'path';
import { z } from 'zod';
import matter from 'gray-matter'; 

// O Schema agora valida apenas o frontmatter
const ScriptFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  author: z.string(),
  createdAt: z.string(),
});

// O tipo final incluirá a propriedade 'sql' que extrairemos do conteúdo
export type SqlScript = z.infer<typeof ScriptFrontmatterSchema> & {
  sql: string;
};

// A nova função que lê e processa os arquivos .mdx
export function getSqlScripts(): SqlScript[] {
  // 1. Encontra o caminho para a pasta de scripts
  const scriptsDir = path.join(process.cwd(), 'data/scripts');
  
  try {
    // 2. Lê todos os nomes de arquivo dentro da pasta
    const filenames = fs.readdirSync(scriptsDir);

    const scripts = filenames
      .filter(filename => filename.endsWith('.mdx')) // 3. Pega apenas arquivos .mdx
      .map(filename => {
        // 4. Lê o conteúdo de cada arquivo
        const filePath = path.join(scriptsDir, filename);
        const fileContent = fs.readFileSync(filePath, 'utf-8');

        // 5. Usa o 'gray-matter' para separar metadados (data) e conteúdo (content)
        const { data, content } = matter(fileContent);
        
        // 6. Extrai o bloco de código SQL do conteúdo principal do Markdown
        const sqlMatch = content.match(/```sql\n([\s\S]*?)\n```/);
        const sql = sqlMatch ? sqlMatch[1].trim() : '-- Script SQL não encontrado --';
        
        // 7. Valida o frontmatter com Zod
        const frontmatter = ScriptFrontmatterSchema.parse(data);

        // 8. Retorna o objeto completo do script
        return {
          ...frontmatter,
          sql,
        };
      });

    return scripts;
  } catch (error) {
    console.error("Falha ao ler ou processar os arquivos de script MDX:", error);
    return [];
  }
}