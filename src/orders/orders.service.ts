import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { ProductsService } from '../products/products.service'; // Importez ProductsService
import { UsersService } from '../users/users.service'; // Importez UsersService
import { format } from 'date-fns'; // Importation correcte de format

dotenv.config();

@Injectable()
export class OrdersService {
  private readonly apiKey = process.env.AIRTABLE_API_KEY;
  private readonly baseId = process.env.AIRTABLE_BASE_ID;
  private readonly tableName = process.env.AIRTABLE_ORDERS_TABLE;

  constructor(
    //private readonly blacklistService: BlacklistService, // Injectez BlacklistService
    private readonly productsService: ProductsService,   // Injectez ProductsService
    private readonly usersService: UsersService,   // Injectez UsersService

  ) {}

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
    try {
      const response = await axios.get(`${this.getUrl()}/${id}`, 
      { headers: this.getHeaders() });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la commande :', error.response?.data || error.message);
      throw new Error('Commande introuvable.');
    }
  }

      async create(data: any): Promise<any> {
        try {
          // Formater les données pour Airtable
          const formattedData = {
            buyer: data.buyerId, // Tableau contenant l'ID de l'acheteur
            products: data.products.map(product => product.id), // Extraire uniquement les IDs des produits
            //status: data.status,
            totalPrice: 0, // Initialiser à 0, puis calculer le prix total
            //Qty: data.products.map(product => product.quantity), // Quantités des produits
            Qty: data.products.map(product => product.quantity).join(' , '), // Convertir le tableau en chaîne

          };
      
          // Calculer le prix total
          let totalPrice = 0;
          for (const product of data.products) {
            const productRecord = await this.productsService.findOne(product.id); // Récupérer le produit depuis Airtable
            totalPrice += productRecord.fields.price * product.quantity;
          }
          formattedData.totalPrice = totalPrice;
      
          console.log('Données formatées pour Airtable :', formattedData);

          let products = formattedData.products;
          let quantities = formattedData.Qty;

          // Calculer les paiements par agriculteur
          const farmerPayments = await this.calculateFarmerPayments(products, quantities);

          // Envoyer les données à Airtable
          const response = await axios.post(
            this.getUrl(),
            { records: [{ fields: formattedData
              //farmerPayments: JSON.stringify(farmerPayments) // Stocker les paiements sous forme de chaîne JSON
             }] },
            { headers: this.getHeaders() }
          );
      
          console.log('Commande créée avec succès :', response.data);
          return response.data.records[0];
        } catch (error) {
          console.error('Erreur lors de la création de la commande :', error.response?.data || error.message);
          throw error; //('Impossible de créer la commande.');
        }
      }

 // Mettre à jour une commande
 async update(id: string, data: any): Promise<any> {
  try {
    // Récupérer la commande existante
    const existingOrder = await this.findOne(id);

    // Vérifier si la commande existe
    if (!existingOrder) {
      throw  Error('Commande introuvable.');
    }

    // Vérifier si la commande est encore en statut "pending"
    const currentStatus = existingOrder.fields.status;
    if (currentStatus !== 'pending') {
      throw  Error('Impossible de modifier une commande déjà traitée.');
    }

    // Formater les données pour Airtable
    const formattedData = {
      products: data.products.map(product => product.id), // IDs des produits
      Qty: data.products.map(product => product.quantity).join(' , '), // Convertir le tableau en chaîne
      status: data.status || 'pending', // Conserver le statut actuel ou mettre à jour
      totalPrice: 0, // Initialiser à 0, puis calculer le prix total

    };

    // Calculer le prix total
    let totalPrice = 0;
    for (const product of data.products) {
      const productRecord = await this.productsService.findOne(product.id); // Récupérer le produit depuis Airtable
      totalPrice += productRecord.fields.price * product.quantity;
    }
    formattedData.totalPrice = totalPrice;

    console.log('Données formatées pour la mise à jour :', formattedData);

    // Envoyer les données mises à jour à Airtable
    const response = await axios.patch(
      `${this.getUrl()}/${id}`,
      { fields: formattedData },
      { headers: this.getHeaders() }
    );

    console.log('Commande mise à jour avec succès :', response.data);
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la commande :', error.response?.data || error.message);
    throw  error; //('Impossible de mettre à jour la commande.')
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

   // Mettre à jour le statut d'une commande
    async updateStatus(id: string, status: string): Promise<any> {
      try {
        // Récupérer la commande existante
        const existingOrder = await this.findOne(id);
    
        if (!existingOrder) {
          throw Error('Commande introuvable.');
        }
    
        // Vérifier si le statut actuel permet la mise à jour
        const currentStatus = existingOrder.fields.status;
        const allowedStatusTransitions = {
          pending: ['confirmed'], // Une commande "pending" peut passer à "confirmed"
          confirmed: ['delivered'], // Une commande "confirmed" peut passer à "delivered"
        };
    
        if (!allowedStatusTransitions[currentStatus]?.includes(status)) {
          throw Error(`Impossible de passer la commande de "${currentStatus}" à "${status}".`);
        }
    
        // Si le statut devient "confirmed", mettre à jour le stock des produits
        if (status === 'confirmed') {
          let products = existingOrder.fields.products;
          let quantities = existingOrder.fields.Qty;

          console.log('Produits avant normalisation :', products);
          console.log('Quantités avant normalisation :', quantities);
    
          // Normaliser products et quantities en tableaux
          if (typeof products === 'string') {
            try {
              products = JSON.parse(products);
            } catch (error) {
              products = [products];
            }
          } else if (!Array.isArray(products)) {
            products = [products];
          }
    
          if (typeof quantities === 'string') {
            try {
              quantities = JSON.parse(quantities); // Convertir la chaîne JSON en tableau
            } catch (error) {
              // Si JSON.parse échoue, tenter de gérer comme une chaîne séparée par des virgules
              if (quantities.includes(',')) {
                quantities = quantities.split(',').map(qty => qty.trim()); // Diviser par virgule et nettoyer
              } else {
                quantities = [quantities]; // Considérer comme une seule valeur
              }
            }
          } else if (typeof quantities === 'number') {
            quantities = [quantities]; // Convertir en tableau si c'est un nombre
          } else if (!Array.isArray(quantities)) {
            quantities = [quantities]; // Convertir en tableau si ce n'est pas déjà un tableau
          }
        
          // FORCER LA CONVERSION EN TABLEAU POUR QUANTITIES
          if (!Array.isArray(quantities)) {
            quantities = [quantities];
          }

          console.log('Produits après normalisation :', products);
          console.log('Quantités après normalisation :', quantities);
        
          // Convertir les quantités en nombres
          quantities = quantities.map(Number);
    
          // Vérifier que les produits et les quantités ont la même longueur
          if (products.length !== quantities.length) {
            throw Error('Les données de la commande sont incohérentes.');
          }
    
          // Mettre à jour le stock des produits
          for (let i = 0; i < products.length; i++) {
            const productId = products[i];
            const quantity = quantities[i];
            await this.productsService.updateStock(productId, quantity);
          }
    
          // Calculer les paiements par agriculteur
          const farmerPayments = await this.calculateFarmerPayments(products, quantities);
    
          // Envoyer les données mises à jour à Airtable
          const response = await axios.patch(
            `${this.getUrl()}/${id}`,
            {
              fields: {
                status,
                farmerPayments: JSON.stringify(farmerPayments), // Stocker les paiements sous forme de chaîne JSON
              },
            },
            { headers: this.getHeaders() }
          );
    
          console.log('Statut de la commande mis à jour avec succès :', response.data);
          return response.data;
        }
      } catch (error) {
        console.error('Erreur lors de la mise à jour du statut de la commande :', error.message);
        throw error; // Propager l'erreur telle quelle
      }
    }
  
// Ajouter une méthode pour regrouper les produits par agriculteur
async calculateFarmerPayments(products: string[], quantities: number[]): Promise<any> {
  const farmerPayments = {};

  for (let i = 0; i < products.length; i++) {
    const productId = products[i];
    const quantity = quantities[i];

    // Récupérer les détails du produit depuis Airtable
    const product = await this.productsService.findOne(productId);

    if (!product) {
      throw Error (`Produit avec l'ID ${productId} introuvable.`);
    }

    const farmerId = product.fields.farmerId[0]; // ID de l'agriculteur (relation)
    const price = product.fields.price || 0; // Prix unitaire
    const lib = product.fields.Name; // Libellé du produit

    
    // Récupérer les détails de l'agriculteur
    const farmer = await this.usersService.findOne(farmerId);
    const name = farmer.fields.name || 'Nom inconnu';
    const farmerEmail = farmer.fields.email || 'Email inconnu';


    // Calculer le montant total pour cet agriculteur
    const totalAmount = price * quantity;

    // Ajouter ou mettre à jour les paiements pour cet agriculteur
    if (!farmerPayments[farmerId]) {
      farmerPayments[farmerId] = {
        farmerId,
        name: name, // Nom de l'agriculteur
        email: farmerEmail, // Email de l'agriculteur
        totalAmount: 0,
        totalProducts: 0, // Nouveau paramètre : nombre de produits distincts
        products: [],
      };
    }

    farmerPayments[farmerId].totalAmount += totalAmount;
    farmerPayments[farmerId].totalProducts += 1; // Incrémenter le nombre de produits distincts
    farmerPayments[farmerId].products.push({
      productId,
      lib,
      quantity,
      price,
      total: totalAmount,
    });
  }

  return Object.values(farmerPayments); // Convertir en tableau
}

// Récupérer les commandes pour un agriculteur spécifique
async getOrdersByFarmer(farmerId: string): Promise<any> {
  try {
    // Récupérer toutes les commandes depuis Airtable
    const response = await axios.get(this.getUrl(), { headers: this.getHeaders() });
    const orders = response.data.records;

    // Déclarer explicitement le type du tableau farmerOrders
    type FarmerOrder = {
      orderId: string;
      status: string;
      totalAmount: number;
      totalProducts: number;
      date: string;
      products: any[];
    };

    const farmerOrders: FarmerOrder[] = [];

    for (const order of orders) {
      const orderId = order.id;
      const fields = order.fields;

      // Vérifier si le champ farmerPayments existe et contient des données
      if (!fields.farmerPayments) continue;

      let farmerPayments;
      try {
        farmerPayments = JSON.parse(fields.farmerPayments); // Parser les paiements en JSON
      } catch (error) {
        console.error(`Erreur lors du parsing de farmerPayments pour la commande ${orderId}`);
        continue;
      }

      // Trouver les paiements spécifiques à cet agriculteur
      const farmerPayment = farmerPayments.find(payment => payment.farmerId === farmerId);



      if (farmerPayment) {
            // Formatter la date
            const rawDate = fields.createdAt; // Supposons que le champ "date" existe dans Airtable
            const formattedDate = rawDate ? format(new Date(rawDate), 'dd/MM/yyyy HH:mm') : 'Date inconnue';

        // Ajouter les détails de la commande pour cet agriculteur
        farmerOrders.push({
          orderId,
          status: fields.status,
          date: formattedDate,
          totalAmount: farmerPayment.totalAmount,
          totalProducts: farmerPayment.totalProducts,
          products: farmerPayment.products,
        });
      }
    }

    return farmerOrders;
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes pour l\'agriculteur :', error.response?.data || error.message);
    throw error; //('Impossible de récupérer les commandes pour cet agriculteur.');
  }
}
}