import { Module, forwardRef } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ProductsModule } from '../products/products.module'; // Importez ProductsModule
import { UsersModule } from '../users/users.module'; // Importez ProductsModule
import { AuthModule } from '../auth/auth.module'; // Importez AuthModule
import { JwtModule } from '@nestjs/jwt'; // Importez JwtModule




@Module({
  imports: [ProductsModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET, // Assurez-vous que JWT_SECRET est défini dans .env
          signOptions: { expiresIn: '60m' }, // Durée de vie du token
        }),
        forwardRef(() => AuthModule), // Utilisez forwardRef() pour éviter la circularité
        forwardRef(() => UsersModule), // Utilisez forwardRef() pour éviter la circularité

  ],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
