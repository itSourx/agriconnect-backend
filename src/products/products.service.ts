import { Injectable, Logger, ConflictException, HttpException, HttpStatus, UnauthorizedException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { UsersService } from '../users/users.service'; // Importez ProfilesService
import { Express } from 'express';
import * as multer from 'multer';
import * as FormData from 'form-data';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import { GCSService } from '../google_cloud/gcs.service';
import { unlinkSync } from 'fs';



dotenv.config();

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_PRODUCTS_TABLE;

  constructor(
    private readonly usersService: UsersService, // Injection de UsersService
    private readonly gcsService: GCSService) {} 

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

  
  /*async findAll(page = 1, perPage = 21): Promise<any[]> {
    const offset = (page - 1) * perPage;
    const response = await axios.get(this.getUrl(), {
      headers: this.getHeaders(),
      params: {
        pageSize: perPage,
        offset: offset > 0 ? offset.toString() : undefined,
      },
    });
    console.error('Données de produits chargées:', response);
    return response.data.records;
  }
  */

async findAll(): Promise<any[]> {
  try {
    console.log('Récupération de tous les enregistrements...');

    let allRecords: any[] = [];
    let offset: string | undefined = undefined;

    do {
      // Effectuer une requête pour récupérer une page d'enregistrements
      const response = await axios.get(this.getUrl(), {
        headers: this.getHeaders(),
        params: {
          pageSize: 100, // Limite maximale par requête
          offset: offset,
        },
      });

      // Ajouter les enregistrements de la page actuelle à la liste complète
      allRecords = allRecords.concat(response.data.records);

      // Mettre à jour l'offset pour la prochaine requête
      offset = response.data.offset;
    } while (offset); // Continuer tant qu'il y a un offset

    console.log(`Nombre total d'enregistrements récupérés : ${allRecords.length}`);
    return allRecords;
  } catch (error) {
    console.error('Erreur lors de la récupération des enregistrements :', error.message);
    throw error;
  }
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

  async create(data: any, files?: Express.Multer.File[]): Promise<any> {
      // Convertir les champs numériques en nombres
      if (typeof data.price === 'string') {
        data.price = parseFloat(data.price);
      }
      if (typeof data.quantity === 'string') {
        data.quantity = parseInt(data.quantity, 10);
      }

    // Si email est fourni, récupérez l'ID du user correspondant
    if (data.email) {
      const user = await this.usersService.findOneByEmail(data.email);

      if (!user) {
        throw new Error(`Cet utilisateur "${data.email}" n'existe pas.`);
      }

      // Formatez le champ "user" comme un tableau d'IDs
      data.user = [user.id];
      delete data.email; // Supprimez email car il n'est pas stocké directement
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
      throw error; //('Impossible de créer ce produit.');
    }
  }

  async update(
    id: string,
    data: any = {}, // Initialiser data comme un objet vide par défaut
    files?: Express.Multer.File[], // Fichiers uploadés pour Photo
    galleryFiles?: Express.Multer.File[] // Fichiers uploadés pour Gallery
  ): Promise<any> {
    try {
      console.log('Données reçues dans le service :', data);

      // Convertir price en nombre si c'est une chaîne
      if (data.price && typeof data.price === 'string') {
        data.price = parseFloat(data.price); // Conversion en nombre
      }
      
      // Convertir quantity en nombre si c'est une chaîne
      if (data.quantity && typeof data.quantity === 'string') {
        data.quantity = parseInt(data.quantity); // Conversion en nombre
      }


      // Gestion des images locales pour le champ Photo
      if (files && files.length > 0) {
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

        // Remplacer ou ajouter les nouvelles URLs au champ Photo
        data.Photo = uploadedImages.map(url => ({ url }));
      }

      // Gestion des images locales pour le champ Gallery
      if (galleryFiles && galleryFiles.length > 0) {
        const uploadedGalleryImages = await Promise.all(
          galleryFiles.map(async (file) => {
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

        // Remplacer ou ajouter les nouvelles URLs au champ Gallery
        data.Gallery = uploadedGalleryImages.map(url => ({ url }));
      }

      // Normaliser les données finales avant envoi à Airtable
      const normalizedData = { ...data }; // Convertit [Object: null prototype] en un objet standard
      console.log('Données envoyées à Airtable :', { fields: normalizedData });

      // Envoyer les données mises à jour à Airtable
      const response = await axios.patch(
        `${this.getUrl()}/${id}`,
        { fields: normalizedData },
        { headers: this.getHeaders() }
      );

      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit :', error.message);
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
      const currentStock = Number(product.fields.quantity || 0); // Convertir en nombre
      if (currentStock < quantity) {
        throw Error(`Le produit avec l'ID ${productId} n'a pas suffisamment de stock.`);
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
      throw error;
    }
  }
  
  // Méthode pour récupérer les produits d'un agriculteur spécifique
  async findByFarmer(farmerId: string): Promise<any[]> {
    try {
      // Récupérer tous les produits
      const allProducts = await this.findAll();

      // Filtrer les produits par farmerId
      const farmerProducts = allProducts.filter(product => {
        const farmerIds = product.fields.farmerId; // Le champ farmerId est souvent un tableau dans Airtable
        return Array.isArray(farmerIds) && farmerIds.includes(farmerId);
      });

      return farmerProducts;
    } catch (error) {
      console.error('Erreur lors de la recherche des produits par agriculteur :', error.message);
      throw error;
    }
  }
  

}