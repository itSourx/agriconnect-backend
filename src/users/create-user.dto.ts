import { IsEmail, IsString, MinLength, IsDate } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer'; // Importez Type ici


export class CreateUserDto {
  @ApiProperty({
    example: 'doe@example.com',
    description: 'L\'email de l\'utilisateur à souscrire. ',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'John',
    description: 'Le(s) prénom(s) de l\'utilisateur à souscrire. ',
  })
  @IsString()
  FirstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Le nom de l\'utilisateur à souscrire. ',
  })
  @IsString()
  LastName: string;

  @ApiProperty({
  example: 'Doe',
  description: 'Le nom de l\'utilisateur à souscrire. ',
  })
  @IsString()
  Address: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Le nom de l\'utilisateur à souscrire. ',
  })
  @IsString()
  Phone: string;

  @ApiProperty({
    example: '1990-05-20',
    description: "La date de naissance de l'utilisateur au format ISO (YYYY-MM-DD).",
  })
  @IsDate()
  @Type(() => Date) // Convertit automatiquement la chaîne en objet Date
  BirthDate: Date;

  @ApiProperty({
    example: 'doe@example.com',
    description: 'Le type de l\'utilisateur à souscrire. ',
  })
  @IsString()
  profileType: string; // Type de profil : "Agriculteur", "Acheteur", "Admin"

  @ApiProperty({
    example: 'securepassword123',
    description: 'Définir un mot de passe d\'au moins 8 caractères. ',
  })
  @IsString()
  @MinLength(8)
  password: string;
}
