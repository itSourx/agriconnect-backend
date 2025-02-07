import { IsEmail, IsString, IsNumber } from 'class-validator';

export class CreateProductDto {

  @IsString()
  Name: string;

  @IsString()
  description: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  price: number;

  @IsString()
  category: string; // Type de produit : "Cereal", "Fruts", "Legumes..."

  @IsEmail()
  email: string;
}
