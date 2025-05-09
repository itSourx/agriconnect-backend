import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { BlacklistService } from './blacklist.service';
import { UnauthorizedException } from '@nestjs/common'; // Ajoutez cette ligne



@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly blacklistService: BlacklistService,
  ) {}
  
  async validateUser(email: string, password: string): Promise<any> {
    console.log('Tentative de validation pour l’email :', email);

    // Récupérer l'utilisateur depuis Airtable
    const user = await this.usersService.findOneByEmail(email);
    console.log('Données brutes de l’utilisateur :', user);
  
    if (!user) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }

    // Vérifier le statut du compte
    await this.usersService.checkUserStatus(user.fields.email); 
    console.log('Statut de l’utilisateur :', user.fields.Status); 

    // Vérifier si le mot de passe est correct
    //const isPasswordValid = await bcrypt.compare(password, user.fields.password);

    // Vérifier si un mot de passe temporaire existe
    const hasResetPassword = user.fields.resetPassword;

    let isPasswordValid = false;

    if (hasResetPassword) {
      // Vérifier le mot de passe temporaire
      isPasswordValid = await bcrypt.compare(password, user.fields.resetPassword);
    } else {
      // Vérifier le mot de passe habituel
      isPasswordValid = await bcrypt.compare(password, user.fields.password);
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants incorrects.');
    }
  
    
    // Extraire les détails de l'utilisateur
    const sanitizedUser = {
      id: user.id,
      email: user.fields.email || null,
      FirstName: user.fields.FirstName || null, // Utilisez "FirstName" comme dans les logs
      LastName: user.fields.LastName || null,   // Utilisez "LastName" comme dans les logs
      Phone: user.fields.Phone || null,
      Address: user.fields.Address || null,     // Ajoutez cette ligne si le champ existe
      Photo: user.fields.Photo?.[0]?.url || null, // URL de la photo (si c'est un champ Pièce jointe)
      profileType: user.fields.profileType?.[0] || null, // Type de profil (ex. "AGRICULTEUR")
      products: user.fields.ProductsName || [], // Liste des noms des produits
      resetPasswordUsed: !!hasResetPassword, // Indique si le mot de passe temporaire a été utilisé
    };
  
    console.log('Données nettoyées de l’utilisateur :', sanitizedUser); // Log pour vérification
  
    return sanitizedUser;
  }

  async login(user: any): Promise<any> {
    console.log('Tentative de connexion avec :', user.email);
  
    try {
      const userProfile = await this.validateUser(user.email, user.password);
      console.log('Utilisateur validé :', userProfile);
  
      if (!userProfile) {
        throw new UnauthorizedException('Identifiants incorrects.');
      }
  
      const payload = {
        id: userProfile.id,
        email: userProfile.email,
        profile: userProfile.profileType,
      };
  
      const accessToken = this.jwtService.sign(payload);
  
      return {
        access_token: accessToken,
        user: {
          id: userProfile.id,
          FirstName: userProfile.FirstName,
          Adress: userProfile.Adress,
          LastName: userProfile.LastName,
          email: userProfile.email,
          Phone: userProfile.Phone,
          Address: userProfile.Address,
          Photo: userProfile.Photo,
          profileType: userProfile.profileType,
          products: userProfile.products,
          passwordReset: userProfile.isPassReseted,

        },
      };
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      throw error; // Relancer l'erreur pour afficher un message générique au client
    }
  }
}