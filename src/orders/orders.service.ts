import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { ProductsService } from '../products/products.service'; // Importez ProductsService
import { UsersService } from '../users/users.service'; // Importez UsersService
import { format } from 'date-fns'; // Importation correcte de format
import * as fs from 'fs';
import * as path from 'path';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { customFonts } from './custom-fonts'; // Importer les polices personnalisées
import * as nodemailer from 'nodemailer';
import { Buffer } from 'buffer';



dotenv.config();
interface UpdatedFields {
  status: string;
  farmerPayments?: string; // Champ facultatif pour farmerPayments
}
// Définir les types pour pdfmake
type TableCell = string | pdfMake.Content;
interface ProductCell extends pdfMake.Content {
  columns: pdfMake.Content[];
}

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
            Qty: data.products.map(product => product.quantity).join(' , '), // Convertir le tableau en chaîne
            farmerPayments: '', // Ajouter explicitement la propriété farmerPayments
            orderNumber: data.orderNumber,
            //buyerEmail: data.orderNumber,
          };
     
          // Calculer le prix total
          let totalPrice = 0;
          for (const product of data.products) {
            const productRecord = await this.productsService.findOne(product.id); // Récupérer le produit depuis Airtable
            totalPrice += productRecord.fields.price * product.quantity;
          }
          formattedData.totalPrice = totalPrice;

          const productIds = data.products.map(product => product.id);
          const quantities = data.products.map(product => product.quantity);

          // Calculer les paiements par agriculteur
          const farmerPayments = await this.calculateFarmerPayments(productIds, quantities);

        // Ajouter les paiements par agriculteur aux données
         formattedData.farmerPayments = JSON.stringify(farmerPayments); // Stocker sous forme de chaîne JSON

      // Générer une référence aléatoire de 5 chiffres
      const orderNumber = Math.floor(10000 + Math.random() * 90000).toString();
      formattedData.orderNumber = orderNumber; // Ajouter la référence aux données
      
          console.log('Données formatées pour Airtable :', formattedData);

          // Envoyer les données à Airtable
          const response = await axios.post(
            this.getUrl(),
            { records: [{ fields: formattedData }] },
            { headers: this.getHeaders() }
          );
      // Appel de ta fonction sendMail avec l'email comme paramètre
      //this.sendInvoiceByEmail(data.email);

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
          delivered: ['completed'], // Une commande "delivered" peut passer à "completed"

        };
    
        if (!allowedStatusTransitions[currentStatus]?.includes(status)) {
          throw Error(`Impossible de passer la commande de "${currentStatus}" à "${status}".`);
        }
        console.log(`Transition de statut autorisée : "${currentStatus}" → "${status}"`);

        // Si le statut devient "confirmed", mettre à jour le stock des produits
        if (status === 'confirmed') {  
          let products = existingOrder.fields.products;
          let quantities = existingOrder.fields.Qty;
          let mesurements = existingOrder.fields.mesure;


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

          /*if (typeof mesurements === 'string') {
            try {
              mesurements = JSON.parse(mesurements);
            } catch (error) {
              mesurements = [mesurements];
            }
          } else if (!Array.isArray(mesurements)) {
            mesurements = [mesurements];
          }*/
    
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
            //const mesure = mesurements[i];
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
        }else {
          // Mise à jour générique du statut pour tous les autres cas valides (ex: "delivered")
          const response = await axios.patch(
            `${this.getUrl()}/${id}`,
            {
              fields: {
                status,
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
    //const mesure = mesurements[i];

    // Récupérer les détails du produit depuis Airtable
    const product = await this.productsService.findOne(productId);

    if (!product) {
      throw Error (`Produit avec l'ID ${productId} introuvable.`);
    }

    const farmerId = product.fields.farmerId[0]; // ID de l'agriculteur (relation)
    const price = product.fields.price || 0; // Prix unitaire
    const lib = product.fields.Name; // Libellé du produit
    const mesure = product.fields.mesure; // mesure du produit
    const category = product.fields.category; // categorie du produit
    //const img = product.fields.Photo; // Image du produit


    
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
      //img,
      lib,
      category,
      quantity,
      price,
      mesure,
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
      createdDate: string;
      statusDate: string;
      buyer: string;
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

            const rawStatusDate = fields.statusDate; // Supposons que le champ "date" existe dans Airtable
            const formattedStatusDate = rawStatusDate ? format(new Date(rawStatusDate), 'dd/MM/yyyy HH:mm') : 'Date inconnue';

        // Ajouter les détails de la commande pour cet agriculteur
        farmerOrders.push({
          orderId,
          buyer: fields.buyerName,
          totalAmount: farmerPayment.totalAmount,
          status: fields.status,
          createdDate: formattedDate,
          statusDate: formattedStatusDate,
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

async getOrderPayments(orderId: string): Promise<any> {
  try {
    // Récupérer la commande existante
    const existingOrder = await this.findOne(orderId);

    if (!existingOrder) {
      throw new Error('Commande introuvable.');
    }

    // Vérifier si le champ farmerPayments existe
    const farmerPayments = existingOrder.fields.farmerPayments;

    if (!farmerPayments) {
      throw new Error('Aucun détail de paiement trouvé pour cette commande.');
    }

    // Parser le champ farmerPayments (stocké sous forme de chaîne JSON)
    let parsedPayments;
    try {
      parsedPayments = JSON.parse(farmerPayments);
    } catch (error) {
      throw new Error('Le format des détails de paiement est incorrect.');
    }

    // Retourner les détails des paiements
    return parsedPayments;
  } catch (error) {
    console.error('Erreur lors de la récupération des détails de paiement :', error.message);
    throw error; // Propager l'erreur telle quelle
  }
}
  private loadPdfFonts() {
    // Assigner explicitement les polices à pdfMake
    (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
  }
  async loadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const base64Image = Buffer.from(response.data).toString('base64');
      return `data:image/jpeg;base64,${base64Image}`;
    } catch (error) {
      console.error(`Erreur lors du téléchargement de l'image : ${imageUrl}`, error);
      throw new Error(`Impossible de charger l'image : ${imageUrl}`);
    }
  }
      /*async generateInvoice(orderId: string): Promise<Buffer> {
          this.loadPdfFonts();
        
          try {
            const existingOrder = await this.findOne(orderId);
        
            if (!existingOrder) {
              throw new Error('Commande introuvable.');
            }
        
            const orderDetails = existingOrder.fields;
        
            // Récupérer les informations du client et de la commande
            const buyerName = orderDetails.buyerName || 'Client inconnu';
            const buyerCompany = orderDetails.buyerCompany || '';
            const buyerPhone = orderDetails.buyerPhone || '';
            const buyerEmail = orderDetails.buyerEmail || '';
            const buyerAddress = orderDetails.buyerAddress || '';
        
            const orderNumber = orderDetails.orderNumber || 'N/A';
            //const orderDate = orderDetails.createdAt || 'Date inconnue';
            const customerRef = orderDetails.customerRef || 'N/A';
        
            const products = orderDetails.products || [];
            const quantities = orderDetails.Qty || [];
        
            console.log('Produits bruts :', products);
            console.log('Quantités brutes :', quantities);
        
            const normalizedProducts = Array.isArray(products) ? products : [products];
            let normalizedQuantities = Array.isArray(quantities)
              ? quantities.map(Number)
              : [Number(quantities)];
        
            if (typeof quantities === 'string') {
              normalizedQuantities = quantities.split(',').map(qty => {
                const parsedQty = Number(qty.trim());
                return isNaN(parsedQty) ? 0 : parsedQty;
              });
            }
        
            console.log('Produits normalisés :', normalizedProducts);
            console.log('Quantités normalisées :', normalizedQuantities);
        
            if (normalizedProducts.length !== normalizedQuantities.length) {
              throw new Error('Les données de la commande sont incohérentes.');
            }
        
            const rawDate = orderDetails.createdAt;
            const formattedDate = rawDate ? format(new Date(rawDate), 'dd/MM/yyyy') : 'Date inconnue';
        
            // Calculer le sous-total (totalPrice) et la taxe totale (taxTotal)
            let totalPrice = 0; // Sous-total (prix avant taxes)
            let taxTotal = 0;   // Total des taxes
        
            for (let i = 0; i < normalizedProducts.length; i++) {
              const productId = normalizedProducts[i];
              const product = await this.productsService.findOne(productId);
              const productName = product?.fields.Name || 'Produit inconnu';
              //const category = product?.fields.category || 'Produit inconnu';
              const price = product?.fields.price || 0;
              const quantity = normalizedQuantities[i];
              const taxRate = 0.20; //product?.fields.taxRate || 0; // Taux de taxe (par exemple, 0.44 pour 44%)
        
              const subtotalForProduct = price * quantity; // Sous-total pour ce produit
              const taxForProduct = subtotalForProduct * taxRate; // Taxe pour ce produit
        
              totalPrice += subtotalForProduct; // Ajouter au sous-total global
              taxTotal += taxForProduct;       // Ajouter à la taxe totale
            }
        
            const totalWithTax = totalPrice + taxTotal; // Montant total incluant les taxes
        
            const content: any[] = [];
        
            // En-tête de la facture
            content.push({
              columns: [
                {
                  stack: [
                    { text: 'SOURX LIMITED', style: 'header', margin: [0, 5, 0, 0] },
                    { text: '71-75 Shelton Street Covent Garden', bold: true, margin: [0, 5, 0, 0] },
                    { text: 'London WC2H 9JQ', bold: true, margin: [0, 0, 0, 0] },
                    { text: 'VAT Registration No: 438434679', bold: true, margin: [0, 0, 0, 0] },
                    { text: 'Registered in England No: 08828978', bold: true, margin: [0, 0, 0, 0] },
                  ],
                },
                {
                  image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==', // Remplacez par le chemin ou la base64 de votre logo
                  //image: 'data:image/png;base64,https://sourx.com/wp-content/uploads/2023/08/sourx-emea-format-es.-copy.png',
                  width: 50,
                },
              ],
            });
        
            //content.push({ text: 'Pro-Forma', style: 'subheader' });

            // Blocs Order number et Customer info
          content.push({
            columns: [
              {
                // Colonne de gauche : Customer info
                stack: [
                  { text: 'Customer info:', style: 'sectionHeader' },
                  { text: `Name: ${buyerName}`, margin: [0, 0, 0, 5] },
                  { text: `Company: ${buyerCompany}`, margin: [0, 0, 0, 5] },
                  { text: `Phone: ${buyerPhone}`, margin: [0, 0, 0, 5] },
                  { text: `Email: ${buyerEmail}`, margin: [0, 0, 0, 5] },
                  { text: `Address: ${buyerAddress}`, margin: [0, 0, 0, 5] },
                ],
                width: '50%',
              },
              {
                // Colonne de droite : Order number, Date, Amount, Customer Ref.
                stack: [
                  { text: 'Pro-Forma:', style: 'sectionHeader', alignment: 'right' },
                  { text: `Order number: ${orderNumber}`, alignment: 'right', margin: [0, 0, 0, 5] },
                  { text: `Date: ${formattedDate}`, alignment: 'right', margin: [0, 0, 0, 5] },
                  { text: `Amount: ${totalWithTax.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 0, 0, 5] },
                  { text: `Customer Ref.: ${customerRef}`, alignment: 'right', margin: [0, 0, 0, 5] },
                ],
                width: '50%',
              },
            ],
            columnGap: 10, // Espace entre les colonnes
          });
  
            // Détails des produits
            content.push({ text: 'Product Details', style: 'sectionHeader' });
        
            const bodyRows: Array<[string, number, string, string]> = [];
            for (let i = 0; i < normalizedProducts.length; i++) {
              const productId = normalizedProducts[i];
              const product = await this.productsService.findOne(productId);
              const productName = product?.fields.Name || 'Produit inconnu';
              const category = product?.fields.category || 'Categorie inconnue';
              const photoUrl = product?.fields.Photo?.[0]?.url || '';
                            
              let imageBase64 = '';
              if (photoUrl) {
                try {
                  imageBase64 = await this.loadImageAsBase64(photoUrl);
                } catch (error) {
                  console.error('Erreur lors du chargement de l\'image :', error.message);
                  imageBase64 = ''; // Image non disponible
                }
              }

              const price = product?.fields.price || 0;
              //const taxRate = product?.fields.taxRate || 0;
              const taxRate = 0.20;
              const quantity = normalizedQuantities[i];

              console.log(`Produit ID: ${productId}, Nom: ${productName}, Prix: ${price}, Quantité: ${quantity}`);
            
              if (!product) {
                console.warn(`Produit avec l'ID ${productId} introuvable.`);
              }
                    
              const subtotalForProduct = price * quantity;
              const taxForProduct = subtotalForProduct * taxRate;
              const totalIncTax = subtotalForProduct + taxForProduct;

              // Valider les valeurs
              if (isNaN(subtotalForProduct)) {
                console.error(`Le calcul du total a échoué pour le produit ${productName}. Prix: ${price}, Quantité: ${
                  quantity
                }`);
                throw new Error(`Données invalides pour le produit ${productName}. Prix: ${price}, Quantité: ${quantity}`);
              }    
              console.log('Produit :', productName);
              console.log('Catégorie :', category);
              console.log('Image Base64 :', imageBase64);
              bodyRows.push([
                //`${productName} (${category})`, 
                /*{
                  columns: [
                    { image: imageBase64, width: 50 }, // Image
                    { text: `${productName} (${category})`, margin: [10, 0, 0, 0] }, // Nom du produit et catégorie 
                  ],
                }as any,
                quantity, 
                `${price} FCFA`, 
                `${subtotalForProduct.toFixed(2)} FCFA`, // Total hors taxes
                //`${taxForProduct.toFixed(2)} FCFA`, // Taxe
                //`${totalIncTax.toFixed(2)} FCFA`,       // Total incluant taxes
              ]);
            }
        
            content.push({
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto'], // 4colonnes
                //widths: [50, 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    //{ text: 'Image', style: 'tableHeader' }, // En-tête pour les images
                    { text: 'Product', style: 'tableHeader' },
                    { text: 'Qty', style: 'tableHeader' },
                    { text: 'Price', style: 'tableHeader' },
                    { text: 'Total', style: 'tableHeader' },
                    //{ text: 'Tax', style: 'tableHeader' },
                    //{ text: 'Total(inc. tax)', style: 'tableHeader' }
                  ],
                  //...bodyRows,
                  ...bodyRows.map(row => row.map(cell => ({ text: cell, style: 'tableBody' }))),
                ],
              },
              //layout: 'noBorders',
              layout: 'headerLineOnly', // Ajoute une ligne après les titres des colonnes et à la fin du tableau
              margin: [0, 10, 0, 5],
            });

            // Ligne horizontale à la fin du tableau
            content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595 - 40, y2: 0, lineWidth: 2 }] });  //, lineWidth: 0.5

            // Résumé
            //content.push({ text: 'Summary', style: 'sectionHeader' });
            content.push({ text: `Subtotal: ${totalPrice.toFixed(2)} FCFA`, alignment: 'right', margin: [20, 5, 0, 0] });
            content.push({ text: `Tax: ${taxTotal.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 5, 0, 0] });
            content.push({ text: `Total: ${totalWithTax.toFixed(2)} FCFA`, bold: true, alignment: 'right', margin: [0, 5, 0, 0] });
        
            const docDefinition = {
              content,
              footer: (currentPage, pageCount) => {
                return {
                  text: `Page ${currentPage} of ${pageCount} | Thank you for your purchase! All informations are protected by SOURX Ltd terms & policy.`,
                  alignment: 'center',
                  fontSize: 10,
                  margin: [0, 0, 0, 20], // Ajustez la marge inférieure si nécessaire
                };
              },
              styles: {
                //header: { fontSize: 24, bold: true, alignment: 'center', color: '#007BFF', margin: [0, 0, 0, 15] },
                header: { fontSize: 25, bold: true, alignment: 'left', color: '#007BFF', margin: [0, 5, 0, 0] },
                subheader: { fontSize: 18, bold: true, alignment: 'center', color: '#007BFF', margin: [0, 0, 0, 10] },
                sectionHeader: { fontSize: 16, bold: true, color: '#007BFF', margin: [0, 15, 0, 5] },
                tableHeader: { bold: true, fontSize: 13, color: '#007BFF' },
                tableBody: { fontSize: 12, color: 'black' },
                //footer: { fontSize: 10, alignment: 'center', margin: [0, 20, 0, 0] },
              },
              defaultStyle: { font: 'Roboto' }, // Utiliser Roboto comme police par défaut
              pageSize: 'A4',
              pageMargins: [20, 20, 20, 50],
            };
        
            return new Promise((resolve, reject) => {
              (pdfMake as any).createPdf(docDefinition).getBuffer((buffer: Buffer) => {
                if (buffer) {
                  resolve(buffer);
                } else {
                  reject(new Error('Erreur lors de la génération du PDF.'));
                }
              });
            });
          } catch (error) {
            console.error('Erreur lors de la génération de la facture :', error.message);
            throw error;
          }
        }*/

        //VERSION 2
        async generateInvoice(orderId: string): Promise<Buffer> {
          this.loadPdfFonts();
        
          try {
            const existingOrder = await this.findOne(orderId);
            if (!existingOrder) throw new Error('Commande introuvable.');
        
            const orderDetails = existingOrder.fields;
            const buyerName = orderDetails.buyerName || 'Client inconnu';
            const buyerCompany = orderDetails.buyerCompany || '';
            const buyerPhone = orderDetails.buyerPhone || '';
            const buyerEmail = orderDetails.buyerEmail || '';
            const buyerAddress = orderDetails.buyerAddress || '';
            const orderNumber = orderDetails.orderNumber || 'N/A';
            const customerRef = orderDetails.customerRef || 'N/A';
        
            const products = orderDetails.products || [];
            const quantities = orderDetails.Qty || [];
        
            const normalizedProducts = Array.isArray(products) ? products : [products];
            let normalizedQuantities = Array.isArray(quantities)
              ? quantities.map(Number)
              : [Number(quantities)];
        
            if (typeof quantities === 'string') {
              normalizedQuantities = quantities.split(',').map(qty => {
                const parsedQty = Number(qty.trim());
                return isNaN(parsedQty) ? 0 : parsedQty;
              });
            }
        
            if (normalizedProducts.length !== normalizedQuantities.length) {
              throw new Error('Les données de la commande sont incohérentes.');
            }
        
            const rawDate = orderDetails.createdAt;
            const formattedDate = rawDate ? format(new Date(rawDate), 'dd/MM/yyyy') : 'Date inconnue';
        
            let totalPrice = 0;
            let taxTotal = 0;
            const taxRate = 0.20;
            let previousCategory = '';

            const bodyRows: TableCell[][] = [];
        
            for (let i = 0; i < normalizedProducts.length; i++) {
              const productId = normalizedProducts[i];
              const product = await this.productsService.findOne(productId);
              const productName = product?.fields.Name || 'Produit inconnu';
              const category = product?.fields.category || 'Catégorie inconnue';
              const photoUrl = product?.fields.Photo?.[0]?.url || '';
              const price = product?.fields.price || 0;
              const quantity = normalizedQuantities[i];

            // Ajouter une ligne de catégorie si elle a changé
              /*if (category !== previousCategory) {
                bodyRows.push([
                  { 
                    text: category, 
                    colSpan: 5, 
                    style: 'categoryRow',
                    margin: [0, 5, 0, 5] 
                  },
                  '', '', '', '' // cellules vides pour le colspan
                ]);
                previousCategory = category;
              }*/
              const imageBase64 = photoUrl ? await this.loadImageAsBase64(photoUrl) : '';
              const subtotalForProduct = price * quantity;
              const taxForProduct = subtotalForProduct * taxRate;

              totalPrice += subtotalForProduct;
              taxTotal += taxForProduct;
  
              const totalIncTax = subtotalForProduct + taxForProduct;
        
              const productCell: ProductCell = {
                columns: [
                  { 
                    image: imageBase64 || '', 
                    width: 30,
                    height: 30,
                    fit: [30, 30],
                    ...(!imageBase64 && { text: ' ', italics: true, color: 'gray' }) // Espace vide si pas d'image
                  },
                  { 
                    stack: [
                      { text: productName, bold: true },
                      { text: category, fontSize: 10, color: 'gray' }
                    ],
                    margin: [10, 5, 0, 5],
                    width: '*'
                  }
                ]
              };
        
              bodyRows.push([
                productCell,
                quantity.toString(),
                `${price} FCFA`,
                `${subtotalForProduct.toFixed(2)} FCFA`,
                `${taxForProduct.toFixed(2)} FCFA`, // Taxe
                `${totalIncTax.toFixed(2)} FCFA`       // Total incluant taxes
              ]);
            }
            // Charger le logo depuis l'URL
            const logoUrl = 'https://sourx.com/wp-content/uploads/2023/08/logo-agriconnect.png';
            let logoBase64 = '';
            
            try {
              logoBase64 = await this.loadImageAsBase64(logoUrl);
            } catch (error) {
              console.error('Erreur lors du chargement du logo:', error);
              // Vous pouvez utiliser un logo par défaut ou un placeholder ici si nécessaire
            }       

            const totalWithTax = totalPrice + taxTotal;
              // Construction du contenu du PDF

            const content: pdfMake.Content[] = [];
        
            // En-tête de la facture
            content.push({
              columns: [
                {
                  stack: [
                    { text: 'SOURX LIMITED', style: 'header', margin: [0, 5, 0, 0] },
                    { text: '71-75 Shelton Street Covent Garden', bold: true, margin: [0, 5, 0, 0] },
                    { text: 'London WC2H 9JQ', bold: true, margin: [0, 0, 0, 0] },
                    { text: 'VAT Registration No: 438434679', bold: true, margin: [0, 0, 0, 0] },
                    { text: 'Registered in England No: 08828978', bold: true, margin: [0, 0, 0, 0] },
                  ],
                },
                
                /*{
                  image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==',
                  width: 50,
                },*/
                {
                  image: logoBase64 || 'Logo-AgriConnect', // Utilisez un placeholder si le logo ne charge pas
                  width: 100, // Ajustez selon la taille souhaitée
                  alignment: 'right',
                  margin: [0, 0, 0, 10]
                },
                
              ],
            });
        
            // Informations client et commande
            content.push({
              columns: [
                {
                  stack: [
                    { text: 'Customer info:', style: 'sectionHeader' },
                    { text: `Name: ${buyerName}`, margin: [0, 0, 0, 5] },
                    { text: `Company: ${buyerCompany}`, margin: [0, 0, 0, 5] },
                    { text: `Phone: ${buyerPhone}`, margin: [0, 0, 0, 5] },
                    { text: `Email: ${buyerEmail}`, margin: [0, 0, 0, 5] },
                    { text: `Address: ${buyerAddress}`, margin: [0, 0, 0, 5] },
                  ],
                  width: '50%',
                },
                /*{
                  stack: [
                    { text: 'Pro-Forma:', style: 'sectionHeader', alignment: 'right' },
                    { text: `Order number: ${orderNumber}`, alignment: 'right', margin: [0, 0, 0, 5] },
                    { text: `Date: ${formattedDate}`, alignment: 'right', margin: [0, 0, 0, 5] },
                    { text: `Amount: ${totalWithTax.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 0, 0, 5] },
                    { text: `Customer Ref.: ${customerRef}`, alignment: 'right', margin: [0, 0, 0, 5] },
                  ],
                  width: '50%',
                },*/

                // Colonne commande avec fond coloré
                {
                  stack: [
                    { 
                      text: 'Pro-Forma :',
                      style: 'sectionHeader', 
                      alignment: 'right',
                      //margin: [0, 0, 0, 10] 
                    },
                    { 
                      table: {
                        widths: ['*', '*'],
                        body: [
                          [
                            { text: 'Order number:', style: 'infoLabel' },
                            { text: orderNumber, style: 'infoValue' }
                          ],
                          [
                            { text: 'Date:', style: 'infoLabel' },
                            { text: formattedDate, style: 'infoValue' }
                          ],
                          [
                            { text: 'Amount:', style: 'infoLabel' },
                            { text: `${totalWithTax.toFixed(2)} FCFA`, style: 'infoValue' }
                          ],
                          [
                            { text: 'Customer Ref.:', style: 'infoLabel' },
                            { text: customerRef, style: 'infoValue' }
                          ]
                        ]
                      },
                      layout: {
                        hLineWidth: () => 0,
                        vLineWidth: () => 0,
                        paddingTop: () => 5,
                        paddingBottom: () => 5
                      },
                      margin: [0, 0, 0, 0],
                      fillColor: '#b7ebbb' // Couleur de fond gris clair
                    }
                  ],
                  width: '50%',
                }
              ],
              columnGap: 10,
            });
        
            // Détails des produits
            content.push({ text: 'Product Details', style: 'sectionHeader' });
        
            content.push({
              table: {
                headerRows: 1,
                widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
                body: [
                  [
                    { text: 'Product', style: 'tableHeader' },
                    { text: 'Qty', style: 'tableHeader' },
                    { text: 'Price', style: 'tableHeader' },
                    { text: 'Total', style: 'tableHeader' },
                    { text: 'Tax', style: 'tableHeader' },
                    { text: 'Total(inc. tax)', style: 'tableHeader' },
                  ],
                  ...bodyRows
                ],
              },
              layout: 'headerLineOnly',
              margin: [0, 10, 0, 5],
            });
        
            // Résumé
            content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 595 - 40, y2: 0, lineWidth: 2 }] });
            content.push({ text: `Subtotal: ${totalPrice.toFixed(2)} FCFA`, alignment: 'right', margin: [50, 5, 0, 0] });
            content.push({ text: `Tax: ${taxTotal.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 5, 0, 0] });
            content.push({ text: `Total: ${totalWithTax.toFixed(2)} FCFA`, bold: true, alignment: 'right', margin: [0, 5, 0, 0] });
        
            const docDefinition: pdfMake.TDocumentDefinitions = {
              content,
              footer: (currentPage, pageCount) => ({
                text: `Page ${currentPage} of ${pageCount} | Thank you for your purchase! All informations are protected by SOURX Ltd terms & policy.`,
                alignment: 'center',
                fontSize: 10,
                margin: [0, 0, 0, 20],
              }),
              styles: {
                header: { fontSize: 25, bold: true, alignment: 'left', color: '#007BFF', margin: [0, 5, 0, 0] },
                sectionHeader: { fontSize: 16, bold: true, color: '#007BFF', margin: [0, 15, 0, 5] },
                tableHeader: { bold: true, fontSize: 13, color: '#007BFF' },
                //categoryRow: { bold: true, fillColor: '#f5f5f5', color: '#007BFF', fontSize: 12 }
                infoLabel: {
                  bold: true,
                  color: '#555555',
                  margin: [0, 3, 0, 3]
                },
                infoValue: {
                  alignment: 'right',
                  margin: [0, 3, 0, 3]
                }
              },
              defaultStyle: { font: 'Roboto' },
              pageSize: 'A4',
              pageMargins: [20, 20, 20, 50],
            };
        
            return new Promise((resolve, reject) => {
              (pdfMake as any).createPdf(docDefinition).getBuffer((buffer: Buffer) => {
                buffer ? resolve(buffer) : reject(new Error('Erreur lors de la génération du PDF.'));
              });
            });
          } catch (error) {
            console.error('Erreur lors de la génération de la facture :', error);
            throw error;
          }
        }

  //Méthode pour envoyer l'e-mail avec la pièce jointe.
  async sendInvoiceByEmail(orderId: string, buyerEmail: string): Promise<void> {
    try {
      // Générer le fichier PDF
      const pdfBuffer = await this.generateInvoice(orderId);
      
      // Récupérer la commande existante
      const existingOrder = await this.findOne(orderId);
      const orderNumber = existingOrder.fields.orderNumber;

      const fileName = `invoice_${orderNumber}.pdf`;

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

      // Options de l'e-mail
      const mailOptions = {
        from: process.env.EMAIL_USER, // Expéditeur
        to: buyerEmail, // Destinataire
        subject: `Votre facture Pro-Forma - Commande #${orderNumber}`, // Objet
        text: `Bonjour,\n\nVeuillez trouver ci-joint votre facture pour la commande #${orderNumber}.`, // Contenu texte
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer, // Contenu du fichier PDF
          },
        ],
      };

      // Envoyer l'e-mail
      await transporter.sendMail(mailOptions);
      console.log(`Facture envoyée avec succès à ${buyerEmail}`);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la facture par e-mail :', error.message);
      throw error;
    }
  }
}