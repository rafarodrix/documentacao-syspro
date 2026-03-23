/*
  Warnings:

  - You are about to drop the column `atualizaComercial` on the `documento_config` table. All the data in the column will be lost.
  - You are about to drop the column `emitente` on the `documento_config` table. All the data in the column will be lost.
  - You are about to drop the column `processamentoEtapa` on the `documento_config` table. All the data in the column will be lost.
  - You are about to drop the column `setor` on the `documento_config` table. All the data in the column will be lost.
  - You are about to drop the column `tipoPessoa` on the `documento_config` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "documento_config" DROP COLUMN "atualizaComercial",
DROP COLUMN "emitente",
DROP COLUMN "processamentoEtapa",
DROP COLUMN "setor",
DROP COLUMN "tipoPessoa",
ADD COLUMN     "comportamentos" TEXT[],
ADD COLUMN     "tpNFCredito" TEXT,
ADD COLUMN     "tpNFDebito" TEXT,
ALTER COLUMN "empresa" DROP NOT NULL,
ALTER COLUMN "empresa" SET DEFAULT '',
ALTER COLUMN "modelo" SET DEFAULT '55',
ALTER COLUMN "serie" SET DEFAULT '1',
ALTER COLUMN "movimentaEstoque" SET DEFAULT 'SAIDA',
ALTER COLUMN "finalidadeNFe" SET DEFAULT '1';
