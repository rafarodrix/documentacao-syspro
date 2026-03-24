import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { SqlScriptFrontmatterSchema, type SqlScript } from "@/features/sql-scripts/domain/model";

export function getSqlScripts(): SqlScript[] {
  const candidateDirs = [
    path.join(process.cwd(), "content/scripts"),
    path.join(process.cwd(), "src/data/scripts"),
    path.join(process.cwd(), "data/scripts"),
  ];
  const scriptsDir = candidateDirs.find((dir) => fs.existsSync(dir));

  try {
    if (!scriptsDir) {
      console.warn("Diretorio de scripts nao encontrado em:", candidateDirs.join(" | "));
      return [];
    }

    const filenames = fs.readdirSync(scriptsDir);

    return filenames
      .filter((filename) => filename.endsWith(".mdx"))
      .map((filename) => {
        const filePath = path.join(scriptsDir, filename);
        const fileContent = fs.readFileSync(filePath, "utf-8");
        const { data, content } = matter(fileContent);
        const sqlMatch = content.match(/```sql([\s\S]*?)```/);
        const sql = sqlMatch ? sqlMatch[1].trim() : "-- Script SQL nao encontrado --";
        const frontmatter = SqlScriptFrontmatterSchema.parse(data);

        return { ...frontmatter, sql };
      });
  } catch (error) {
    console.error("Ocorreu um erro ao processar os scripts:", error);
    return [];
  }
}
