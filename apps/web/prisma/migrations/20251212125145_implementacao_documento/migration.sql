-- CreateTable
CREATE TABLE "documento_config" (
    "id" TEXT NOT NULL,
    "empresa" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "grupoDocumento" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "serie" TEXT NOT NULL,
    "emitente" TEXT NOT NULL,
    "tipoPessoa" TEXT NOT NULL,
    "setor" TEXT,
    "atualizaComercial" BOOLEAN NOT NULL DEFAULT true,
    "movimentaEstoque" TEXT NOT NULL,
    "processamentoEtapa" BOOLEAN NOT NULL DEFAULT false,
    "finalidadeNFe" TEXT NOT NULL,
    "cfopEstadual" TEXT,
    "cfopInterestadual" TEXT,
    "cfopInternacional" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documento_config_pkey" PRIMARY KEY ("id")
);
