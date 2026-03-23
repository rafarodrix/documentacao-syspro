-- AlterTable
ALTER TABLE "documento_config" ADD COLUMN     "atualizaComercial" BOOLEAN DEFAULT true,
ADD COLUMN     "emitente" TEXT DEFAULT 'PROPRIO',
ADD COLUMN     "maximoItens" INTEGER DEFAULT 999,
ADD COLUMN     "processamentoEtapa" BOOLEAN DEFAULT false;
