import { Injectable, ConflictException, HttpException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt'; // Importez bcrypt ici
import { ProfilesService } from '../profiles/profiles.service'; // Importez ProfilesService
import { BlacklistService } from '../auth/blacklist.service';
import { randomBytes } from 'crypto'; // Pour générer un mot de passe aléatoire
import * as nodemailer from 'nodemailer';
import { GCSService } from '../google_cloud/gcs.service';
import { unlinkSync } from 'fs';
import { Storage } from '@google-cloud/storage';


dotenv.config();

@Injectable()
export class UsersService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_USERS_TABLE;
  private base;

  constructor(
    private readonly blacklistService: BlacklistService, // Injectez BlacklistService
    private readonly profilesService: ProfilesService, // Injectez ProfilesService
    private readonly gcsService: GCSService) {}    



  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl() {
    return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
  }

  // Vérifier si un mot de passe fourni correspond au mot de passe haché stocké
  private async verifyPassword(storedHash: string, plainTextPassword: string): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, storedHash);
  }

  // Hacher le mot de passe avant de créer un utilisateur
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // Nombre de tours de hachage (recommandé : 10)
    return await bcrypt.hash(password, saltRounds);
  }

  // Changer le mot de passe d'un utilisateur
    async changePassword(userId: string, oldPassword: string, newPassword: string, token: string): Promise<any> {
      // Récupérer l'utilisateur actuel
      const user = await this.findOne(userId);
  
      if (!user) {
        throw new UnauthorizedException('Utilisateur introuvable.');
      }
  
      // Vérifier que l'ancien mot de passe est correct
      const passwordHash = user.fields.password; // Champ contenant le mot de passe haché
      const isPasswordValid = await this.verifyPassword(passwordHash, oldPassword);
  
      if (!isPasswordValid) {
        throw new UnauthorizedException('Ancien mot de passe incorrect.');
      }
  
      // Valider le nouveau mot de passe
      if (newPassword.length < 8) {
        throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
      }
  
      // Hacher le nouveau mot de passe
      const hashedNewPassword = await this.hashPassword(newPassword);
  
      // Mettre à jour le mot de passe dans Airtable
      try {
        const response = await axios.patch(
          `${this.getUrl()}/${userId}`,
          { fields: { password: hashedNewPassword } },
          { headers: this.getHeaders() }
        );
  
      // Appeler la fonction logout pour déconnecter l'utilisateur
      await this.logout(token);

      return { message: 'Mot de passe mis à jour avec succès! Vous avez été déconnecté.' };
      } catch (error) {
        console.error('Erreur lors de la mise à jour du mot de passe :', error);
        throw new Error('Impossible de mettre à jour le mot de passe.');
      }
    }
  
  
  // Ajouter le token à la liste noire (si applicable)
  private async logout(token: string): Promise<void> {
    if (!token) {
      return; // Si aucun token n'est fourni, ne faites rien
    }

    // Ajouter le token à la liste noire
    await this.blacklistService.add(token);
  }

  async findAll(page = 1, perPage = 20): Promise<any[]> {
    const offset = (page - 1) * perPage;
    const response = await axios.get(this.getUrl(), {
      headers: this.getHeaders(),
      params: {
        pageSize: perPage,
        offset: offset > 0 ? offset.toString() : undefined,
      },
    });
    return response.data.records;
  }

// Récupérer tous les utilisateurs filtrés par profil
  async findUsersByProfile(profileId: string): Promise<any[]> {
    try {
      const response = await axios.get(this.getUrl(), {
        headers: this.getHeaders(),
        params: {
          filterByFormula: `({profile}="${profileId}")`, // Filtrer par ID de profil
        },
      });

      return response.data.records;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs par profil :', error);
      throw new Error('Impossible de récupérer les utilisateurs.');
    }
  }

  // Récupérer un utilisateur par ID
  async findOne(id: string): Promise<any> {
    const response = await axios.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }

  // Rechercher un utilisateur par email
  async findOneByEmail(email: string): Promise<any | null> {
    try {
      const response = await axios.get(this.getUrl(), {
        headers: this.getHeaders(),
        params: {
          filterByFormula: `({email}="${email}")`, // Formulaire Airtable pour filtrer par email
        },
      });

      /*if (response.data.records.length > 0) {
        return response.data.records[0];
      }*/

      console.log('Réponse brute d’Airtable :', response.data);
      if (response.data.records.length > 0) {
        const user = response.data.records[0];
    
       // Normalisez le champ "email" pour s'assurer qu'il est une chaîne de texte
      if (Array.isArray(user.fields.email)) {
        user.fields.type = user.fields.email[0]; // Prenez le premier élément du tableau
        }
      
        return user;
        } 

      return null; // Aucun utilisateur trouvé avec cet email
    } catch (error) {
      console.error('Erreur lors de la recherche d’utilisateur par email :', error);
      //return null;
      throw new Error('Impossible de récupérer les données utilisateur.');

    }
  }

  async create(data: any, files?: Express.Multer.File[]): Promise<any> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.findOneByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }
    // Générer une référence aléatoire de 5 chiffres
    const reference = Math.floor(1000000 + Math.random() * 9000000).toString();
    data.reference = reference; // Ajouter la référence aux données

    // Gestion des images locales
    if (files && files.length > 0) {
      // Uploader chaque fichier vers GCS
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          try {
            // Uploader l'image vers GCS
            const publicUrl = await this.gcsService.uploadImage(file.path);

            // Supprimer le fichier local après l'upload
            unlinkSync(file.path); // Nettoyage du fichier temporaire

            return publicUrl;
          } catch (error) {
            console.error('Erreur lors de l\'upload de l\'image :', error.message);
            throw new Error('Impossible d\'uploader l\'image.');
          }
        })
      );
      // Remplacer le champ Photo par les URLs des images uploadées
      data.Photo = uploadedImages.map(url => ({ url }));
    } else if (data.Photo) {
      // Si Photo est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.Photo === 'string') {
        data.Photo = [{ url: data.Photo }];
      }
      // Si Photo est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.Photo)) {
        data.Photo = data.Photo.map(url => ({ url }));
      }
    }

    // Si profileType est fourni, récupérez l'ID du profil correspondant
    if (data.profileType) {
      const profile = await this.profilesService.findOneByType(data.profileType);
  
      if (!profile) {
        throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
      }
  
      // Formatez le champ "profile" comme un tableau d'IDs
      data.profile = [profile.id];
      delete data.profileType; // Supprimez profileType car il n'est pas stocké directement
    } 
    // Hacher le mot de passe
    if (data.password) {
      data.password = await this.hashPassword(data.password); // Hachez le mot de passe
    }
  
    try {
      // Envoyer les données à Airtable
      const response = await axios.post(
        this.getUrl(),
        { records: [{ fields: data }] },
        { headers: this.getHeaders() }
      );
  
      // Extraire l'ID généré par Airtable
      const createdRecord = response.data.records[0];
      const generatedId = createdRecord.id;
  
      return {
        id: generatedId,
        fields: createdRecord.fields,
      };
    } catch (error) {
      console.error('Erreur lors de la création de l’utilisateur :', error);
      throw new Error('Impossible de créer l’utilisateur.');
    }
  }

  // Mettre à jour un utilisateur
  async update(id: string, data: any, files?: Express.Multer.File[]): Promise<any> {
    try {
      if (data.ifu && typeof data.ifu === 'string') {
        data.ifu = parseInt(data.ifu); // Conversion en nombre
      }
      // Si profileType est fourni, récupérez l'ID du profil correspondant
      if (data.profileType) {
        const profile = await this.profilesService.findOneByType(data.profileType);
  
        if (!profile) {
          throw new Error(`Le type de profil "${data.profileType}" n'existe pas.`);
        }
  
        // Formatez le champ "profile" comme un tableau d'IDs
        data.profile = [profile.id];
        delete data.profileType; // Supprimez profileType car il n'est pas stocké directement
      }
    // Gestion des images locales
    if (files && files.length > 0) {
      // Uploader chaque fichier vers GCS
      const uploadedImages = await Promise.all(
        files.map(async (file) => {
          try {
            // Uploader l'image vers GCS
            const publicUrl = await this.gcsService.uploadImage(file.path);

            // Supprimer le fichier local après l'upload
            unlinkSync(file.path); // Nettoyage du fichier temporaire

            return publicUrl;
          } catch (error) {
            console.error('Erreur lors de l\'upload de l\'image :', error.message);
            throw new Error('Impossible d\'uploader l\'image.');
          }
        })
      );
      // Remplacer le champ Photo par les URLs des images uploadées
      data.Photo = uploadedImages.map(url => ({ url }));
    } else if (data.Photo) {
      // Si Photo est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.Photo === 'string') {
        data.Photo = [{ url: data.Photo }];
      }
      // Si Photo est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.Photo)) {
        data.Photo = data.Photo.map(url => ({ url }));
      }
    }
      
      // Mettez à jour l'utilisateur dans Airtable
      const response = await axios.patch(
        `${this.getUrl()}/${id}`,
        { fields: data },
        { headers: this.getHeaders() }
      );
  
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l’utilisateur :', error);
      throw new Error('Impossible de mettre à jour l’utilisateur.');
    }
  }

  // Supprimer un utilisateur
  async delete(id: string): Promise<any> {
    const response = await axios.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }
    // Récupérer tous les utilisateurs  correspondant à un profil donné
    async findAllByProfile(profile: string): Promise<any[]> {
      try {
        const response = await axios.get(this.getUrl(), {
          headers: this.getHeaders(),
          params: {
            filterByFormula: `({profile}="${profile}")`, // Filtrer par profil d'utilisateur
          },
        });
  
        // Normalisez les champs "catégory" si nécessaire
        const users = response.data.records.map((user) => {
          if (Array.isArray(user.fields.profile)) {
            user.fields.profile = user.fields.profile[0]; // Prenez le premier élément du tableau
          }
          return user;
        });
  
        return users; // Retourne tous les enregistrements correspondants
      } catch (error) {
        console.error('Erreur lors de la récupération des utilisateurs par profil :', error);
        throw new Error('Impossible de récupérer les utilisateurs.');
      }
    }
  // Générer un mot de passe aléatoire de 9 caractères
  private generateRandomPassword(length: number = 9): string {
    const possibleCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));
    }
    return password;
  }

  // Réinitialiser le mot de passe d'un utilisateur
  async resetPassword(email: string): Promise<any> {
    // Vérifier si l'utilisateur existe
    const user = await this.findOneByEmail(email);

    if (!user) {
      throw new NotFoundException('Aucun utilisateur trouvé avec cet email.');
    }

    // Générer un mot de passe temporaire
    const temporaryPassword = this.generateRandomPassword(9);

    // Hacher le mot de passe temporaire
    const hashedTemporaryPassword = await bcrypt.hash(temporaryPassword, 10);

    try {
      // Enregistrer le mot de passe temporaire dans le champ resetPassword
      const response = await axios.patch(
        `${this.getUrl()}/${user.id}`,
        { fields: { resetPassword: hashedTemporaryPassword } },
        { headers: this.getHeaders() }
      );

      // Retourner le mot de passe temporaire (non haché) pour une éventuelle notification
      //return { message: 'Mot de passe temporaire généré avec succès.', temporaryPassword };

    // Envoyer le mot de passe temporaire par email
    await this.sendPasswordResetEmail(email, temporaryPassword);

    return { message: 'Un mot de passe temporaire a été envoyé à votre adresse email.' };

    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe :', error);
      throw new Error('Impossible de réinitialiser le mot de passe.');
    }
  }

  private async sendPasswordResetEmail(email: string, temporaryPassword: string): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: 'mail.sourx.com', // Remplacez par l'adresse SMTP de votre hébergeur
      port: 465, // Port SMTP (généralement 587 pour TLS ou 465 pour SSL)
      secure: true, // Utilisez `true` si le port est 465 (SSL)
      auth: {
        user: process.env.EMAIL_USER, // Votre adresse email
        pass: process.env.EMAIL_PASSWORD, // Votre mot de passe email
      },
      tls: {
        rejectUnauthorized: false, // Ignorer les certificats non valides (si nécessaire)
      },
    });
  
    const mailOptions = {
      from: process.env.EMAIL_USER, // Expéditeur
      to: email, // Destinataire
      subject: 'Réinitialisation de votre mot de passe',
      text: `Votre nouveau mot de passe temporaire est : ${temporaryPassword}. Veuillez le changer dès que possible.`,
    };
  
    await transporter.sendMail(mailOptions);
  }

  async validateResetPassword(email: string, temporaryPassword: string, newPassword: string, token: string): Promise<any> {
    // Récupérer l'utilisateur par email
    const user = await this.findOneByEmail(email);
  
    if (!user) {
      throw new NotFoundException('Aucun utilisateur trouvé avec cet email.');
    }
  
    // Vérifier si le mot de passe temporaire est valide
    const storedTemporaryPassword = user.fields.resetPassword;
    if (!storedTemporaryPassword) {
      throw new UnauthorizedException('Aucun mot de passe temporaire enregistré.');
    }
  
    const isPasswordValid = await bcrypt.compare(temporaryPassword, storedTemporaryPassword);
  
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe temporaire incorrect.');
    }
  
    // Valider le nouveau mot de passe
    if (newPassword.length < 8) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 8 caractères.');
    }
  
    // Hacher le nouveau mot de passe
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  
    try {
      // Mettre à jour le mot de passe permanent et effacer le champ resetPassword
      const response = await axios.patch(
        `${this.getUrl()}/${user.id}`,
        { fields: { password: hashedNewPassword, resetPassword: '' } },
        { headers: this.getHeaders() }
      );
  
      //return { message: 'Mot de passe mis à jour avec succès.' };
      // Appeler la fonction logout pour déconnecter l'utilisateur
      await this.logout(token);

      return { message: 'Mot de passe mis à jour avec succès! Vous avez été déconnecté.' };
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe :', error);
      throw new Error('Impossible de mettre à jour le mot de passe.');
    }
  }

  //récupérer les détails du profil
  async getProfileById(id: string): Promise<any> {
    try {
      const response = await axios.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil :', error);
      return null;
    }
  }

// Vérification du statut d'un utilisateur
async checkUserStatus(email: string): Promise<void> {
  console.log(`Vérification du statut de l'utilisateur : ${email}`);
  const user = await this.findOneByEmail(email);

  if (user.fields.Status === 'Deactivated') {
    throw new Error('Votre compte a été bloqué. Veuillez contacter l\'administrateur ');
  }
  console.log(`Statut validé avec succès pour l'utilisateur' : ${email}`);
}

// Débloquer un compte
async unlockUser(email: string) {
  // Étape 1 : Rechercher l'utilisateur par email
  const user = await this.findOneByEmail(email);

  // Vérifier si l'utilisateur existe
  if (!user) {
    throw new Error('Aucun utilisateur trouvé avec cet email.');
  }

  // Étape 2 : Vérifier si le compte est déjà activé
  if (user.Status === 'Activated') {
    throw new Error('Le compte est déjà activé.');
  }

  try {
    // Étape 3 : Activer le compte
    await this.update(user.id, { Status: 'Activated', tentatives_echec: 0 });

    // Retourner un message de succès
    return { message: 'Le compte a été activé avec succès.' };
  } catch (error) {
    // Gérer les erreurs potentielles lors de la mise à jour
    console.error('Erreur lors de l\'activation du compte :', error);
    throw new Error('Une erreur est survenue lors de l\'activation du compte.');
  }
}

// Bbloquer un compte
async blockUser(email: string): Promise<void> {
  // Étape 1 : Rechercher l'utilisateur par email
  const user = await this.findOneByEmail(email);

  // Vérifier si l'utilisateur existe
  if (!user) {
    throw new Error('Aucun utilisateur trouvé avec cet email.');
  }

  // Étape 2 : Vérifier si le compte est déjà bloqué
  if (user.Status === 'Deactivated') {
    throw new Error('Le compte est déjà bloqué.');
  }

  try {
    // Étape 3 : Bloquer le compte
    await this.update(user.id, { Status: 'Deactivated' });
  } catch (error) {
    // Gérer les erreurs potentielles lors de la mise à jour
    console.error('Erreur lors du blocage du compte :', error);
    throw new Error('Une erreur est survenue lors du blocage du compte.');
  }
}

}