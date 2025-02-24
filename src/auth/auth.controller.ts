import { Controller, Post, Body, Req } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common'; // Ajoutez cette ligne
import { AuthService } from './auth.service';
import { BlacklistService } from './blacklist.service';
import { JwtService } from '@nestjs/jwt';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginDto } from './login.dto'; // Importez LoginDto

@ApiTags('auth') // Groupe ce contrôleur sous le tag "auth"
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService,
    private readonly blacklistService: BlacklistService

  ) {}


  /*@Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;
  
    if (!email || !password) {
      throw new BadRequestException('Email et mot de passe sont requis.');
    }
  
    // Appeler le service pour se connecter
    return this.authService.login({ email, password });
  }*/
  @Post('login')
  @ApiOperation({ summary: 'Connexion d\'un utilisateur' }) // Description de l'opération
  @ApiBody({ type: LoginDto }) // Modèle du corps de la requête
  @ApiResponse({
    status: 201,
    description: 'Connexion réussie.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 'recUSER123',
          email: 'user@example.com',
          name: 'John Doe',
          profileType: 'Acheteur',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Connexion réussie.' }) // Réponse en cas de succès
  @ApiResponse({ status: 401, description: 'Identifiants incorrects.' }) // Réponse en cas d'échec
  async login(@Body() body: LoginDto) {
    const { email, password } = body;

    if (!email || !password) {
      throw new UnauthorizedException('Email et mot de passe sont requis.');
    }

    // Appeler le service pour valider l'utilisateur
    const user = await this.authService.validateUser(email, password);

    // Vérifier si le mot de passe temporaire a été utilisé
    if (user.resetPasswordUsed) {
      return {
        //access_token: accessToken,
        user,
        message: 'Vous devez changer votre mot de passe et vous reconnecter.',
        requiresPasswordChange: true,
      };
    }

    return this.authService.login({ email, password });
    //return this.authService.login(user);


  }
  /*async login(@Body() body: { email: string; password: string }) {
    const { email, password } = body;

    // Validez l'utilisateur
    const user = await this.authService.validateUser(email, password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials'); // Utilisez l'exception ici
    }

    // Générez le token JWT
    return this.authService.login(user);
  }*/

  @Post('logout') // Importez @Post depuis @nestjs/common
  async logout(@Req() req: any): Promise<any> {
    const token = req.headers.authorization?.split(' ')[1]; // Récupérer le token de l'en-tête

    if (!token) {
      throw new Error('Aucun token trouvé.');
    }

    // Ajouter le token à la liste noire
    await this.blacklistService.add(token);

    return { message: 'Déconnexion réussie.' };
  }
}