import { Injectable, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UnauthorizedException } from '@nestjs/common';
import { BlacklistService } from './blacklist.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService,
    @Inject(BlacklistService) private readonly blacklistService: BlacklistService,

  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    console.log('Requête reçue:', request.url);
    //console.log('Headers:', request.headers);

    const token = this.extractTokenFromHeader(request);

    if (!token) {
    console.error('Token absent ou mal formaté.');
      //return false; // Aucun token trouvé
      throw new UnauthorizedException('Aucun token fourni.');
    }

    // Vérifiez si le token est dans la liste noire
    if (await this.blacklistService.isBlacklisted(token)) {
      return false; // Token invalide
    }

    try {
      console.log('Tentative de validation du token...');
      const payload = await this.jwtService.verifyAsync(token);
      console.log('Payload décodé:', payload);

      // Ajoutez le payload (données décodées) à la requête pour utilisation ultérieure
      request['user'] = payload;
      return true; // Token valide
    } catch {
       //console.error('Erreur lors de la validation du token:', error);

      //return false; // Token invalide ou expiré
      throw new UnauthorizedException('Token invalide ou expiré.');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'bearer' ? token : undefined;
    console.log('Headers:', request.headers);
    console.log('Token extrait:', token);
  }
}