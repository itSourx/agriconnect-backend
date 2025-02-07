import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { UsersModule } from '../users/users.module'; // Importez UsresModule


@Module({
  imports: [UsersModule],
  providers: [ProductsService],
  exports: [ProductsService],
  controllers: [ProductsController]
  
})
export class ProductsModule {}
