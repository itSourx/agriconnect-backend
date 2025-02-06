import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';
import { AuthModule } from './auth/auth.module';
import { JwtModule } from '@nestjs/jwt';
import { ProfilesModule } from './profiles/profiles.module';
import * as dotenv from 'dotenv';

dotenv.config();

@Module({
  imports: [UsersModule, ProductsModule, OrdersModule, AuthModule, ProfilesModule, JwtModule.register({
    secret: process.env.JWT_SECRET, // Utilisez la clé secrète depuis .env
    signOptions: { expiresIn: '60m' }, // Optionnel : durée de vie du token (par défaut : 1 heure)
  }), ProfilesModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
