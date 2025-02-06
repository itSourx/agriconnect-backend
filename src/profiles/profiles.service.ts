import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class ProfilesService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_PROFILES_TABLE;

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl() {
    return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
  }
  
  async findAll(): Promise<any[]> {
    const response = await axios.get(this.getUrl(), { headers: this.getHeaders() });
    return response.data.records;
  }

  async findOne(id: string): Promise<any> {
    const response = await axios.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }

  async create(data: any): Promise<any> {
    const response = await axios.post(
      this.getUrl(),
      { records: [{ fields: data }] },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async update(id: string, data: any): Promise<any> {
    const response = await axios.patch(
      `${this.getUrl()}/${id}`,
      { fields: data },
      { headers: this.getHeaders() }
    );
    return response.data;
  }

  async delete(id: string): Promise<any> {
    const response = await axios.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }


  // Récupérer un profil par son nom (type d'utilisateur)
  /*async findOneByType(profileType: string): Promise<any | null> {
    try {
      const response = await axios.get(this.getUrl(), {
        headers: this.getHeaders(),
        params: {
          filterByFormula: `({profileType}="${profileType}")`, // Formulaire Airtable pour filtrer par type
        },
      });

      if (response.data.records.length > 0) {
        return response.data.records[0];
      }

      return null; // Aucun profil trouvé avec ce type
    } catch (error) {
      console.error('Erreur lors de la recherche du profil :', error);
      return null;
    }
  }*/
    async findOneByType(type: string): Promise<any | null> {
      try {
        const response = await axios.get(this.getUrl(), {
          headers: this.getHeaders(),
          params: {
            filterByFormula: `({type}="${type}")`,
          },
        });
    
        if (response.data.records.length > 0) {
          const profile = response.data.records[0];
    
      // Normalisez le champ "type" pour s'assurer qu'il est une chaîne de texte
      if (Array.isArray(profile.fields.type)) {
          profile.fields.type = profile.fields.type[0]; // Prenez le premier élément du tableau
        }
    
          return profile;
        }
    
        return null;
      } catch (error) {
        console.error('Erreur lors de la recherche du profil :', error);
        return null;
      }
    }
}