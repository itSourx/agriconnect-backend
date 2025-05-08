import { Module } from '@nestjs/common';
import { GCSService } from './gcs.service';

@Module({
  providers: [GCSService],
  exports: [GCSService], // Exportez GCSService pour qu'il soit disponible dans d'autres modules
})
export class GCSModule {}