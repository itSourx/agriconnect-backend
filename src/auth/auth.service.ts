import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { BlacklistService } from './blacklist.service';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly blacklistService: BlacklistService,
  ) {}

  // Valider un utilisateur par email et mot de passe
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    if (user && (await bcrypt.compare(password, user.fields.password))) {
      // Supprimez les champs sensibles avant de retourner l'utilisateur
      const { password: _, ...sanitizedUser } = user.fields;
      return sanitizedUser;
    }

    return null;
  }
  
  // Générer un jeton JWT pour l'utilisateur
  async login(user: any) {
    const payload = { email: user.email, userId: user.id};
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}