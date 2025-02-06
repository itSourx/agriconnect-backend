import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module'; // <--- Importez UsersModule ici
import * as dotenv from 'dotenv';
import { BlacklistService } from './blacklist.service';


dotenv.config();

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Remplacez ceci par votre clé secrète JWT
      signOptions: { expiresIn: '60m' }, // Optionnel : durée de validité du token
    }),
    //UsersModule, // <--- Ajoutez UsersModule ici
    forwardRef(() => UsersModule), // Utilisez forwardRef() pour éviter la circularité
  ],
  providers: [AuthService, BlacklistService],
  controllers: [AuthController],
  exports: [JwtModule, BlacklistService], // Exportez JwtModule pour l'utiliser dans d'autres modules
})
export class AuthModule {}