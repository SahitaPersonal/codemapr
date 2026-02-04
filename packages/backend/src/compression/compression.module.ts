import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompressedDataEntity } from './entities/compressed-data.entity';
import { DataCompressionService } from './data-compression.service';
import { CompressedStorageService } from './compressed-storage.service';
import { CompressionController } from './compression.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompressedDataEntity]),
  ],
  controllers: [
    CompressionController,
  ],
  providers: [
    DataCompressionService,
    CompressedStorageService,
  ],
  exports: [
    DataCompressionService,
    CompressedStorageService,
  ],
})
export class CompressionModule {}