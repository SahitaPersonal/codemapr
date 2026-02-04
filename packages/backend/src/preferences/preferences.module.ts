import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserPreferenceEntity } from './entities/user-preference.entity';
import { UserPreferenceService } from './user-preference.service';
import { UserPreferenceController } from './user-preference.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPreferenceEntity]),
  ],
  controllers: [
    UserPreferenceController,
  ],
  providers: [
    UserPreferenceService,
  ],
  exports: [
    UserPreferenceService,
  ],
})
export class PreferencesModule {}