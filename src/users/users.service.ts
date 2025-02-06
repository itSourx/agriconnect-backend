import { Injectable, ConflictException } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt'; // Importez bcrypt ici
import { ProfilesService } from '../profiles/profiles.service'; // Importez ProfilesService



dotenv.config();

@Injectable()
export class UsersService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_USERS_TABLE;

  constructor(private readonly profilesService: ProfilesService) {} // Injection de ProfilesService

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl() {
    return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
  }

  // Hacher le mot de passe avant de créer un utilisateur
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 10; // Nombre de tours de hachage (recommandé : 10)
    return await bcrypt.hash(password, saltRounds);
  }
  /* // Vérifier si un mot de passe fourni correspond au mot de passe haché stocké dans Airtable
private async verifyPassword(storedHash: string, plainTextPassword: string): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, storedHash);
}*/

async findAll(page = 1, perPage = 10): Promise<any[]> {
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

      if (response.data.records.length > 0) {
        return response.data.records[0];
      }

      return null; // Aucun utilisateur trouvé avec cet email
    } catch (error) {
      console.error('Erreur lors de la recherche d’utilisateur par email :', error);
      return null;
    }
  }

  async create(data: any): Promise<any> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.findOneByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà.');
    }
    if (data.Photo) {
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
  async update(id: string, data: any): Promise<any> {
  // Traiter le champ Photo s'il est présent
  if (data.Photo) {
    // Si Photo est une chaîne (URL), convertissez-la en tableau d'objets
    if (typeof data.Photo === 'string') {
      data.Photo = [{ url: data.Photo }];
    }
    // Si Photo est un tableau de chaînes, convertissez chaque élément
    else if (Array.isArray(data.Photo)) {
      data.Photo = data.Photo.map(url => ({ url }));
    }
  }
    try {
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
  /*async update(id: string, data: any): Promise<any> {
    const response = await axios.patch(
      `${this.getUrl()}/${id}`,
      { fields: data },
      { headers: this.getHeaders() }
    );
    return response.data;
  }*/


  // Supprimer un utilisateur
  async delete(id: string): Promise<any> {
    const response = await axios.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }
}