import { Module } from '@nestjs/common';
import { ItemCatalogService } from './item-catalog.service';

@Module({
  providers: [ItemCatalogService],
  exports: [ItemCatalogService],
})
export class CatalogModule {}
