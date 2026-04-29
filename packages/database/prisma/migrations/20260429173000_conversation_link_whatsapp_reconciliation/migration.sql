-- AlterTable
ALTER TABLE "ConversationLink"
ADD COLUMN     "whatsappDeliveryStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "lastDeliveryFailureCode" TEXT,
ADD COLUMN     "lastDeliveryFailureAt" TIMESTAMP(3),
ADD COLUMN     "lastDeliveryOriginalNumber" TEXT,
ADD COLUMN     "lastDeliveryFallbackNumber" TEXT,
ADD COLUMN     "lastInboundWhatsappNumber" TEXT,
ADD COLUMN     "lastSuccessfulOutboundWhatsappNumber" TEXT;
