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
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur qui crée le produit doit être passé en paramètre. C\'est à récupérer automatiquement dans la réponse du serveur à l\'authentification de l\'utilsateur (/auth/login). ',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: ' "Photo": ["https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTZr9eQcb7-uBiQkX3yXiUWfF_aOd68UyFi1g&s"] ',
    description: 'Tableau d\'URLs des photos du produit',
  })
  @IsArray()
  @IsString({ each: true })
  Photo: string[];
}

