import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class OrdersService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_ORDERS_TABLE;

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl() {
    return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
  }

  // Récupérer toutes les commandes
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

  // Récupérer une commande par ID
  async findOne(id: string): Promise<any> {
    const response = await axios.get(`${this.getUrl()}/${id}`, 
    { headers: this.getHeaders() });
    return response.data;
  }

  // Créer une nouvelle commande
  async create(data: any): Promise<any> {
    try {
      const response = await axios.post(
        this.getUrl(),
        { records: [{ fields: data }] },
        { headers: this.getHeaders() }
      );
      return response.data.records[0];
    } catch (error) {
      console.error('Erreur lors de la création de la commande :', error);
      throw new Error('Impossible de créer la commande.');
    }
  }

  // Mettre à jour une commande
  async update(id: string, data: any): Promise<any> {
    try {
      const response = await axios.patch(
        `${this.getUrl()}/${id}`,
        { fields: data },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la commande :', error);
      throw new Error('Impossible de mettre à jour la commande.');
    }
  }

  // Supprimer une commande
  async delete(id: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de la commande :', error);
      throw new Error('Impossible de supprimer la commande.');
    }
  }
}