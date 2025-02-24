import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


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
