import { Injectable, ConflictException, HttpException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { UsersService } from '../users/users.service'; // Importez ProfilesService


dotenv.config();

@Injectable()
export class ProductsService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_PRODUCTS_TABLE;

  constructor(private readonly usersService: UsersService) {} // Injection de UsersService
  

  // Ajoutez ici les mêmes méthodes que dans UsersService (findAll, findOne, create, update, delete)
  private getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private getUrl() {
    return `https://api.airtable.com/v0/${this.baseId}/${this.tableName}`;
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
  
  async findOne(id: string): Promise<any> {
    const response = await axios.get(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }
  // Rechercher un produit par nom ou catégorie
  async search(query: string): Promise<any[]> {
    try {
      console.log('Requête de recherche :', query);
  
      const encodedQuery = encodeURIComponent(query.toLowerCase());
      const formula = `OR(
        FIND(LOWER("${encodedQuery}"), LOWER({name})),
        FIND(LOWER("${encodedQuery}"), LOWER({category}))
      )`;
  
      const response = await axios.get(this.getUrl(), {
        headers: this.getHeaders(),
        params: {
          filterByFormula: formula,
        },
      });
  
      console.log('Réponse d’Airtable :', response.data.records);
      return response.data.records;
    } catch (error) {
      console.error('Erreur lors de la recherche de produits :', error);
      return [];
    }
  }
  async create(data: any): Promise<any> {
    // Si email est fourni, récupérez l'ID du user correspondant
    if (data.email) {
      const user = await this.usersService.findOneByEmail(data.email);
  
      if (!user) {
        throw new Error(`Cet utilisateur "${data.email}" n'existe pas.`);
      }
      /*if (user.fields.profile.trim() !== 'AGRICULTEUR') {
        throw new UnauthorizedException('Seul un agriculteur peut ajouter des produits.');
      }*/

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

      // Formatez le champ "user" comme un tableau d'IDs
      data.user = [user.id];
      delete data.email; // Supprimez email car il n'est pas stocké directement
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
      console.error('Erreur lors de la création du produit :', error);
      throw new Error('Impossible de créer ce produit.');
    }
  }

  // Mettre à jour un produit
  async update(id: string, data: any): Promise<any> {
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
    if (data.Gallery) {
      // Si Gallery est une chaîne (URL), convertissez-la en tableau d'objets
      if (typeof data.Gallery === 'string') {
        data.Gallery = [{ url: data.Gallery }];
      }
      // Si Gallery est un tableau de chaînes, convertissez chaque élément
      else if (Array.isArray(data.Gallery)) {
        data.Gallery = data.Photo.map(url => ({ url }));
      }
    }
    
    try {
      const response = await axios.patch(
        `${this.getUrl()}/${id}`,
        { fields: data },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit :', error);
      throw new Error('Impossible de mettre à jour le produit.');
    }
  }

  async delete(id: string): Promise<any> {
    const response = await axios.delete(`${this.getUrl()}/${id}`, { headers: this.getHeaders() });
    return response.data;
  }

    // Récupérer tous les produits  correspondant à un type donné
    async findAllByCategory(category: string): Promise<any[]> {
      try {
        const response = await axios.get(this.getUrl(), {
          headers: this.getHeaders(),
          params: {
            filterByFormula: `({category}="${category}")`, // Filtrer par catégory du produit
          },
        });
  
        // Normalisez les champs "catégory" si nécessaire
        const products = response.data.records.map((product) => {
          if (Array.isArray(product.fields.category)) {
            product.fields.category = product.fields.category[0]; // Prenez le premier élément du tableau
          }
          return product;
        });
  
        return products; // Retourne tous les enregistrements correspondants
      } catch (error) {
        console.error('Erreur lors de la récupération des produits par catégorie :', error);
        throw new Error('Impossible de récupérer les produits.');
      }
  }

  // Mettre à jour le stock d'un produit
  async updateStock(productId: string, quantity: number): Promise<any> {
    try {
      const product = await this.findOne(productId);

      // Vérifier si le produit existe
      if (!product) {
        throw new Error('Produit introuvable.');
      }

      // Vérifier si le stock est suffisant
      //const currentStock = product.fields.quantity || 0;
      const currentStock = Number(product.fields.quantity || 0); // Convertir en nombre
      if (currentStock < quantity) {
        throw new Error(`Le produit avec l'ID ${productId} n'a pas suffisamment de stock.`);
      }

      // Calculer le nouveau stock
      const newStock = currentStock - quantity;

      // Mettre à jour le stock dans Airtable
      const response = await axios.patch(
        //this.getUrl(productId),
        `${this.getUrl()}/${productId}`,
        { fields: { quantity: newStock } },
        { headers: this.getHeaders() }
      );

      console.log(`Stock mis à jour pour le produit ${productId} :`, response.data);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du stock :', error.response?.data || error.message);
      throw new Error('Impossible de mettre à jour le stock.');
    }
  }

  

}