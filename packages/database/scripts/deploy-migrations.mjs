import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log("Verificando migrações falhas no banco de dados...");
    // Deleta a migração falha do histórico se ela não tiver terminado com sucesso
    await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260623113000_remote_host_agent_external_id_unique' AND "finished_at" IS NULL;`
    );
    console.log("Histórico de migração limpo com sucesso.");
  } catch (err) {
    console.log("Nenhuma migração pendente para limpar ou tabela inexistente:", err.message);
  } finally {
    await prisma.$disconnect();
  }

  console.log("Executando prisma migrate deploy...");
  execSync("npx prisma migrate deploy --schema ./prisma/schema.prisma", { stdio: "inherit" });
}

main().catch((err) => {
  console.error("Erro na execução do deploy:", err);
  process.exit(1);
});
