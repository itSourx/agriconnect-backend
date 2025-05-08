import { Module, forwardRef } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtModule } from '@nestjs/jwt'; // Importez JwtModule
import { AuthModule } from '../auth/auth.module'; // Importez AuthModule
import { ProfilesModule } from '../profiles/profiles.module'; // Importez ProfilesModule
import { GCSService } from '../google_cloud/gcs.service'; // Importez le service GCS


@Module({
  imports: [
    ProfilesModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Assurez-vous que JWT_SECRET est défini dans .env
      signOptions: { expiresIn: '60m' }, // Durée de vie du token
    }),
    forwardRef(() => AuthModule), // Utilisez forwardRef() pour éviter la circularité
  ],
  providers: [UsersService, GCSService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
