import { Module } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';

@Module({
  providers: [ProfilesService],
  exports: [ProfilesService], // Exporte ProfilesService pour qu'il soit utilisable dans d'autres modules
  controllers: [ProfilesController]
})
export class ProfilesModule {}
