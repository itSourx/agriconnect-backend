import { Module, forwardRef } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UsersModule } from '../users/users.module'; // Importez UsresModule
import { JwtModule } from '@nestjs/jwt'; // Importez JwtModule
import { AuthModule } from '../auth/auth.module'; // Importez AuthModule
import { GCSService } from './gcs.service'; // Importez le service GCS



@Module({
  imports: [
    UsersModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Assurez-vous que JWT_SECRET est défini dans .env
      signOptions: { expiresIn: '60m' }, // Durée de vie du token
    }),
    forwardRef(() => AuthModule), // Utilisez forwardRef() pour éviter la circularité
  ],
  providers: [ProductsService, GCSService],
  exports: [ProductsService],
  controllers: [ProductsController]
  
})
export class ProductsModule {}
