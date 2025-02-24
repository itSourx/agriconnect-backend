import { IsEmail, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {

  @ApiProperty({
    example: 'Tomates',
    description: 'Le nom du produit',
  })
  @IsString()
  Name: string;

  @ApiProperty({
    example: 'Naturel sans angrais chimiques',
    description: 'Détails sur le produit',
  })
  @IsString()
  description: string;

  @ApiProperty({
    example: '25',
    description: 'La quantité du produit',
  })
  @IsString()
  @IsNumber()
  quantity: number;

  @ApiProperty({
    example: '100F CFA',
    description: 'Le prix du produit',
  })
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 'Fruits',
    description: 'La catégoie du produit. C\'est une liste déroulante ("Cereal", "Fruits", "Legumes...") ',
  })
  @IsString()
  category: string; // Type de produit : "Cereal", "Fruts", "Legumes..."

  @ApiProperty({
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur qui crée le produit doit être passé en paramètre. C\'est à récupérer automatiquement dans la réponse du serveur à l\'authentification de l\'utilsateur (/auth/login). ',
  })
  @IsEmail()
  email: string;
}
