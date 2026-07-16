import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { TaxController } from './tax.controller';
import { TaxService } from './tax.service';
import { NfeParserController } from './nfe-parser.controller';
import { NfeParserService } from './nfe-parser.service';
import { TaxSuggestionService } from './tax-suggestion.service';

@Module({
  imports: [PrismaModule],
  controllers: [TaxController, NfeParserController],
  providers: [TaxService, NfeParserService, TaxSuggestionService],
  exports: [TaxService, NfeParserService, TaxSuggestionService],
})
export class TaxModule {}

