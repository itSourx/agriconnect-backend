import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  FirstName: string;

  @IsString()
  LastName: string;

  @IsString()
  profileType: string; // Type de profil : "Agriculteur", "Acheteur", "Admin"
}
