import { IsEmail, IsString, IsNumber } from 'class-validator';

export class CreateProductDto {
  @IsEmail()
  email: string;

  @IsString()
  Name: string;

  @IsString()
  Description: string;

  @IsNumber()
  Quantity: number;

  @IsNumber()
  Price: number;

  @IsString()
  Category: string; // Type de produit : "Cereal", "Fruts", "Legumes..."
}
