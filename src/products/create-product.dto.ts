import { IsEmail, IsString, IsNumber, IsArray} from 'class-validator';
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
  //@IsString()
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
    example: 'Kilo',
    description: 'La mesure du produit. C\'est une liste déroulante ("Kilo", "Tas", "Unite..") ',
  })
  @IsString()
  mesure: string; // Type de produit : "Kilo", "Tas", "Unite.."

  @ApiProperty({
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur qui crée le produit doit être passé en paramètre. C\'est à récupérer automatiquement dans la réponse du serveur à l\'authentification de l\'utilsateur (/auth/login). ',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Array of photo URLs for the product',
    type: [String], // Indique que c'est un tableau de chaînes de caractères
    example: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
  })
  @IsArray()
  @IsString({ each: true })
  Photo: string[];
}

