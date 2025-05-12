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
//import { customFonts } from './custom-fonts'; // Importer les polices personnalisées
import * as nodemailer from 'nodemailer';
import { Buffer } from 'buffer';
//import { TDocumentDefinitions } from 'pdfmake/interfaces';
//import { TDocumentDefinitions, Content, ContentColumns, ContentStack, ContentTable, ContentImage, Table } from 'pdfmake/interfaces';

dotenv.config();

interface UpdatedFields {
  status: string;
  farmerPayments?: string; // Champ facultatif pour farmerPayments
}
// Définissez manuellement les types si nécessaire
/*interface Content {
  [key: string]: any;
}
interface ContentColumns extends Content {
  columns: Content[];
}
interface ContentStack extends Content {
  stack: Content[];
}
interface ContentTable extends Content {
  table: Table;
}
interface ContentImage extends Content {
  image: string;
  width?: number;
  height?: number;
}
interface Table {
  [key: string]: any;
}*/
//type PdfCell = Content & { colSpan?: number };

// Déclaration manuelle des types nécessaires
interface Content {
  text?: string;
  style?: string;
  margin?: number[];
  alignment?: string;
  bold?: boolean;
  fontSize?: number;
  color?: string;
  fillColor?: string;
  colSpan?: number;
  stack?: Content[];
  columns?: Content[];
  table?: Table;
  image?: string;
  width?: number | string; // Modification ici pour accepter string ('50%', 'auto', etc.)
  height?: number;
  fit?: number[];
  canvas?: any[];
  [key: string]: any;
}

interface Table {
  widths?: any[];
  heights?: any[];
  body?: any[][];
  headerRows?: number;
  dontBreakRows?: boolean;
  keepWithHeaderRows?: number;
}

interface TDocumentDefinitions {
  content: Content[];
  styles?: { [key: string]: Content };
  defaultStyle?: Content;
  pageSize?: string;
  pageMargins?: number[];
  footer?: (currentPage: number, pageCount: number) => Content;
}

type PdfCell = Content;
type ContentColumns = Content;
type ContentStack = Content;
type ContentTable = Content;
type ContentImage = Content;

interface ProductData {
  productId: string;
  productName: string;
  photoUrl: string;
  price: number;
  quantity: number;
  category: string;
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

        // Récupérer l'ID de la commande créée et l'email de l'acheteur
        const createdOrder = response.data.records[0];
        const orderId = createdOrder.id;
        const buyerEmail = createdOrder.fields.buyerEmail; 

        // Envoyer la facture par email
        if (buyerEmail) {
          try {
              await this.sendInvoiceByEmail(orderId, buyerEmail);
              console.log('Email de facture envoyé avec succès à', buyerEmail);
          } catch (emailError) {
              console.error("Erreur lors de l'envoi de l'email de facture:", emailError);
          }
      } else {
          console.warn("Aucun email d'acheteur fourni, l'email de facture ne sera pas envoyé");
      }
          //console.log('Commande créée avec succès :', response.data);
          return createdOrder; //response.data.records[0];
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
      buyerName: string;
      buyerEmail: string;
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
          buyerName: fields.buyerName,
          buyerEmail: fields.buyerEmail,
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
    //(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;

      // Fusion des polices (officielles + personnalisées)
      const fontFiles = {
        ...(pdfFonts as any).pdfMake?.vfs,  // Polices intégrées
        // ...vosPolicesPersonnalisées       // Ajoutez ici vos polices
      };
      
      (pdfMake as any).vfs = fontFiles;
  }
  private async loadImageAsBase64(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      return `data:image/jpeg;base64,${Buffer.from(response.data).toString('base64')}`;
    } catch (error) {
      console.error(`Image loading error: ${imageUrl}`, error);
      return '';
    }
  }

    /*async generateInvoice(orderId: string): Promise<Buffer> {
      this.loadPdfFonts();
  
      try {
        // Récupération des données de la commande
        const existingOrder = await this.findOne(orderId);
        if (!existingOrder) throw new Error('Order not found');
        const copyrightText = `© ${new Date().getFullYear()} SOURX Ltd`;

        const orderDetails = existingOrder.fields;
        const buyerName = orderDetails.buyerName || 'Unknown Client';
        const buyerCompany = orderDetails.buyerCompany || '';
        const buyerPhone = orderDetails.buyerPhone || '';
        const buyerEmail = orderDetails.buyerEmail || '';
        const buyerAddress = orderDetails.buyerAddress || '';
        const orderNumber = orderDetails.orderNumber || 'N/A';
        const customerRef = orderDetails.customerRef || 'N/A';
        const products = orderDetails.products || [];
        const quantities = orderDetails.Qty || [];
  
        // Normalisation des données
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
          throw new Error('Inconsistent order data');
        }
  
        // Formatage de la date
        const formattedDate = orderDetails.createdAt 
          ? format(new Date(orderDetails.createdAt), 'dd/MM/yyyy') 
          : 'Unknown date';
  
        // Calcul des totaux et regroupement par catégorie
        const taxRate = 0.20;
        let totalPrice = 0;
        let taxTotal = 0;
        const bodyRows: PdfCell[][] = [];
        const productsByCategory: Record<string, ProductData[]> = {};
  
        // 1. Regroupement des produits par catégorie
        for (let i = 0; i < normalizedProducts.length; i++) {
          const productId = normalizedProducts[i];
          const product = await this.productsService.findOne(productId);
          const category = product?.fields.category || 'Uncategorized';
          const productData: ProductData = {
            productId,
            productName: product?.fields.Name || 'Unknown Product',
            photoUrl: product?.fields.Photo?.[0]?.url || '',
            price: product?.fields.price || 0,
            quantity: normalizedQuantities[i],
            category
          };
  
          if (!productsByCategory[category]) {
            productsByCategory[category] = [];
          }
          productsByCategory[category].push(productData);
        }
  
        // 2. Construction des lignes du tableau par catégorie
        for (const [category, products] of Object.entries(productsByCategory)) {
          // Ligne d'en-tête de catégorie
          bodyRows.push([
            { 
              text: category.toUpperCase(), 
              colSpan: 6,
              style: 'categoryRow',
              margin: [0, 10, 0, 5]
            },
            '', '', '', '', ''
          ]);
  
          // Lignes de produits pour cette catégorie
          for (const product of products) {
            const imageBase64 = product.photoUrl ? await this.loadImageAsBase64(product.photoUrl) : '';
            const subtotalForProduct = product.price * product.quantity;
            const taxForProduct = subtotalForProduct * taxRate;
            const totalIncTax = subtotalForProduct + taxForProduct;
  
            totalPrice += subtotalForProduct;
            taxTotal += taxForProduct;
  
            bodyRows.push([
              {
                columns: [
                  { 
                    image: imageBase64 || '',
                    width: 30,
                    height: 30,
                    fit: [30, 30],
                    alignment: 'center',
                    margin: [0, 5, 0, 5], // Marge uniforme
                    ...(!imageBase64 && { text: ' ', italics: true })
                  } as ContentImage,
                  { 
                    stack: [
                      //{ text: product.productName, bold: true },
                      { text: product.productName, bold: true, margin: [10, 0, 0, 0] },
                      { text: `Ref: ${product.productId}`, fontSize: 8, color: '#666', margin: [10, 2, 0, 0] }
                    ],
                    margin: [10, 5, 0, 5],
                    width: '*'
                  }
                ]
              },
              //product.quantity.toString(),
              { 
                text: product.quantity.toString(), 
                alignment: 'center',
                margin: [0, 5, 0, 5] 
              },
              //`${product.price.toFixed(2)} FCFA`,
              { 
                text: product.price.toString(), 
                alignment: 'center',
                margin: [0, 5, 0, 5] 
              },
              //`${subtotalForProduct.toFixed(2)} FCFA`,
              { 
                text: subtotalForProduct.toFixed(2), 
                alignment: 'center',
                margin: [0, 5, 0, 5] 
              },
              //`${taxForProduct.toFixed(2)} FCFA`,
              { 
                text: taxForProduct.toFixed(2), 
                alignment: 'center',
                margin: [0, 5, 0, 5] 
              },
              //`${totalIncTax.toFixed(2)} FCFA`
              { 
                text: totalIncTax.toFixed(2), 
                alignment: 'center',
                margin: [0, 5, 0, 5] 
              }
            ]);
          }
        }
  
        const totalWithTax = totalPrice + taxTotal;
  
        // Chargement du logo
        const logoBase64 = await this.loadImageAsBase64(
          'https://sourx.com/wp-content/uploads/2023/08/logo-agriconnect.png'
        );
  
        // Construction du contenu PDF
        const content: Content[] = [];
  
        // 1. En-tête
        const header: ContentColumns = {
          columns: [
            {
              stack: [
                { text: 'SOURX LIMITED', style: 'header', margin: [0, -5, 0, 2] }, // Ajustement vertical
                { text: '71-75 Shelton Street Covent Garden', margin: [0, 0, 0, 2] },
                { text: 'London WC2H 9JQ', margin: [0, 0, 0, 2] },
                { text: 'VAT Registration No: 438434679', margin: [0, 0, 0, 2] },
                { text: 'Registered in England No : 08828978', margin: [0, 0, 0, 0] }

              ],
              width: '70%', // Contrôle de la largeur
              //width: '*', // Prend tout l'espace disponible
              margin: [0, 10, 0, 0], // Ajustement vertical global
            },
            {
              image: logoBase64 || 'agriConnect',
              width: 120,
              alignment: 'right',
              //fit: [50000, 70], // Contrôle hauteur max
              margin: [0, 0, 0, 0] // Suppression des marges inutiles
            } as ContentImage
          ],
          columnGap: 20, // Espace entre les colonnes
          margin: [0, 0, 0, 30]
        };
        content.push(header);
  
        // 2. Informations client/commande
        const customerInfo: ContentColumns = {
          columns: [
            {
              stack: [
                { text: 'Customer info:', style: 'sectionHeader' },
                { text: `Name: ${buyerName}`, margin: [0, 0, 0, 5] },
                { text: `Company: ${buyerCompany}`, margin: [0, 0, 0, 5] },
                { text: `Phone: ${buyerPhone}`, margin: [0, 0, 0, 5] },
                { text: `Email: ${buyerEmail}`, margin: [0, 0, 0, 5] },
                { text: `Address: ${buyerAddress}`, margin: [0, 0, 0, 5] }
              ],
              width: '50%'
            },
            {
              stack: [
                { text: 'Summary :', style: 'sectionHeader', alignment: 'right' },
                { 
                  table: {
                    widths: ['auto', '*'],
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
                  } as Table,
                  //layout: 'noBorders',
                  layout: {
                    hLineWidth: () => 0,
                    vLineWidth: () => 0,
                    paddingTop: () => 5,
                    paddingBottom: () => 5
                  },
                  fillColor: '#F5F5F5',
                  margin: [0, 10, 0, 0]
                }
              ],
              width: '50%'
            }
          ],
          columnGap: 10,
          margin: [0, 0, 0, 20]
        };
        content.push(customerInfo);
  
        // 3. Tableau des produits
        const productsTable: ContentTable = {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Product', style: 'tableHeader', margin: [0, 5, 0, 5] },
                { text: 'Qty', style: 'tableHeader', margin: [0, 5, 0, 5] },
                { text: 'Price', style: 'tableHeader', margin: [0, 5, 0, 5] },
                { text: 'Total', style: 'tableHeader', margin: [0, 5, 0, 5] },
                { text: 'Tax', style: 'tableHeader', margin: [0, 5, 0, 5] },
                { text: 'Total(inc. tax)', style: 'tableHeader', margin: [0, 5, 0, 5] }
              ],
              ...bodyRows
            ]
          },
          layout: 'headerLineOnly', // Ajoute une ligne après les titres des colonnes et à la fin du tableau
          margin: [0, 0, 0, 20]
        };
        content.push(productsTable);
  
        // 4. Totaux
        const totals: ContentStack = {
          stack: [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 555 - 40, y2: 0, lineWidth: 1 }] },
            { text: `Subtotal: ${totalPrice.toFixed(2)} FCFA`, alignment: 'right', margin: [5, 10, 0, 5] },
            { text: `Tax: ${taxTotal.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 0, 0, 5] },
            { text: `Total: ${totalWithTax.toFixed(2)} FCFA`, bold: true, alignment: 'right', margin: [0, 0, 0, 10] }
          ]
        };
        content.push(totals);
  
        // Définition du document
        const docDefinition: TDocumentDefinitions = {
          content,
          footer: (currentPage, pageCount) => ({
            text: `Page ${currentPage} of ${pageCount} | Thank you for your purchase! ${copyrightText}`,
            alignment: 'center',
            fontSize: 9,
            margin: [10, 10, 0, 0]
          }),
          styles: {
            header: {
              fontSize: 18,
              bold: true,
              color: '#009cdb',
              margin: [0, 0, 0, 10]
            },
            sectionHeader: {
              fontSize: 14,
              bold: true,
              color: '#8b6404', //#007BFF
              margin: [0, 0, 0, 10]
            },
            tableHeader: {
              bold: true,
              fontSize: 11,
              color: '#FFFFFF',
              fillColor: '#4CAF50',//'#007BFF',
              alignment: 'center'
            },
            categoryRow: {
              bold: true,
              fontSize: 12,
              color: '#FF9800',
              fillColor: '#F5F5F5',
              margin: [0, 5, 0, 10]
            },
            infoValue: {
              alignment: 'right',
              margin: [0, 3, 0, 3]
            }
          },
          defaultStyle: {
            font: 'Roboto',
            fontSize: 10
          },
          pageSize: 'A4',
          pageMargins: [40, 40, 40, 60]
        };
  
        // Génération du PDF
        return new Promise((resolve, reject) => {
          (pdfMake as any).createPdf(docDefinition).getBuffer((buffer: Buffer) => {
            buffer ? resolve(buffer) : reject(new Error('PDF generation failed'));
          });
        });
  
      } catch (error) {
        console.error('Invoice generation error:', error);
        throw error;
      }
    }*/
      async generateInvoice(orderId: string): Promise<Buffer> {
        this.loadPdfFonts();
    
        try {
          // Récupération des données de la commande
          const existingOrder = await this.findOne(orderId);
          if (!existingOrder) throw new Error('Order not found');
          const copyrightText = `© ${new Date().getFullYear()} SOURX Ltd`;
    
          const orderDetails = existingOrder.fields;
          const buyerName = orderDetails.buyerName || 'Unknown Client';
          const buyerCompany = orderDetails.buyerCompany || '';
          const buyerPhone = orderDetails.buyerPhone || '';
          const buyerEmail = orderDetails.buyerEmail || '';
          const buyerAddress = orderDetails.buyerAddress || '';
          const orderNumber = orderDetails.orderNumber || 'N/A';
          const customerRef = orderDetails.customerRef || 'N/A';
          const products = orderDetails.products || [];
          const quantities = orderDetails.Qty || [];
    
          // Normalisation des données
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
            throw new Error('Inconsistent order data');
          }
    
          // Formatage de la date
          const formattedDate = orderDetails.createdAt 
            ? format(new Date(orderDetails.createdAt), 'dd/MM/yyyy') 
            : 'Unknown date';
    
          // Calcul des totaux et regroupement par catégorie
          const taxRate = 0.18;
          let totalPrice = 0;
          let taxTotal = 0;
          const bodyRows: PdfCell[][] = [];
          const productsByCategory: Record<string, ProductData[]> = {};
    
          // 1. Regroupement des produits par catégorie
          for (let i = 0; i < normalizedProducts.length; i++) {
            const productId = normalizedProducts[i];
            const product = await this.productsService.findOne(productId);
            const category = product?.fields.category || 'Uncategorized';
            const productData: ProductData = {
              productId,
              productName: product?.fields.Name || 'Unknown Product',
              photoUrl: product?.fields.Photo?.[0]?.url || '',
              price: product?.fields.price || 0,
              quantity: normalizedQuantities[i],
              category
            };
    
            if (!productsByCategory[category]) {
              productsByCategory[category] = [];
            }
            productsByCategory[category].push(productData);
          }
    
          // 2. Construction des lignes du tableau par catégorie
          for (const [category, products] of Object.entries(productsByCategory)) {
            // Ligne d'en-tête de catégorie
            bodyRows.push([
              { 
                text: category.toUpperCase(), 
                colSpan: 6,
                style: 'categoryRow',
                margin: [0, 10, 0, 5]
              },
              { text: '' }, 
              { text: '' },
              { text: '' },
              { text: '' },
              { text: '' }
            ]);
    
            // Lignes de produits pour cette catégorie
            for (const product of products) {
              const imageBase64 = product.photoUrl ? await this.loadImageAsBase64(product.photoUrl) : '';
              const subtotalForProduct = product.price * product.quantity;
              const taxForProduct = subtotalForProduct * taxRate;
              const totalIncTax = subtotalForProduct + taxForProduct;
    
              totalPrice += subtotalForProduct;
              taxTotal += taxForProduct;
    
              bodyRows.push([
                {
                  columns: [
                    { 
                      image: imageBase64 || '',
                      width: 30,
                      height: 30,
                      fit: [30, 30],
                      alignment: 'center',
                      margin: [0, 5, 0, 5],
                      ...(!imageBase64 && { text: ' ', italics: true })
                    },
                    { 
                      stack: [
                        { text: product.productName, bold: true, margin: [10, 0, 0, 0] },
                        { text: `Ref: ${product.productId}`, fontSize: 8, color: '#666', margin: [10, 2, 0, 0] }
                      ],
                      margin: [10, 5, 0, 5],
                      width: '*'
                    }
                  ]
                },
                { 
                  text: product.quantity.toString(), 
                  alignment: 'center',
                  margin: [0, 5, 0, 5] 
                },
                { 
                  text: product.price.toString(), 
                  alignment: 'center',
                  margin: [0, 5, 0, 5] 
                },
                { 
                  text: subtotalForProduct.toFixed(2), 
                  alignment: 'center',
                  margin: [0, 5, 0, 5] 
                },
                { 
                  text: taxForProduct.toFixed(2), 
                  alignment: 'center',
                  margin: [0, 5, 0, 5] 
                },
                { 
                  text: totalIncTax.toFixed(2), 
                  alignment: 'center',
                  margin: [0, 5, 0, 5] 
                }
              ]);
            }
          }
    
          const totalWithTax = totalPrice + taxTotal;
    
          // Chargement du logo
          const logoBase64 = await this.loadImageAsBase64(
            'https://sourx.com/wp-content/uploads/2023/08/logo-agriconnect.png'
          );
    
          // Construction du contenu PDF
          const content: Content[] = [];
    
          // 1. En-tête
          const header: ContentColumns = {
            columns: [
              {
                stack: [
                  { text: 'SOURX LIMITED', style: 'header', margin: [0, -5, 0, 2] },
                  { text: '71-75 Shelton Street Covent Garden', margin: [0, 0, 0, 2] },
                  { text: 'London WC2H 9JQ', margin: [0, 0, 0, 2] },
                  { text: 'VAT Registration No: 438434679', margin: [0, 0, 0, 2] },
                  { text: 'Registered in England No : 08828978', margin: [0, 0, 0, 0] }
                ],
                width: '70%',
                margin: [0, 10, 0, 0],
              },
              {
                image: logoBase64 || 'agriConnect',
                width: 120,
                alignment: 'right',
                margin: [0, 0, 0, 0]
              }
            ],
            columnGap: 20,
            margin: [0, 0, 0, 30]
          };
          content.push(header);
    
          // 2. Informations client/commande
          const customerInfo: ContentColumns = {
            columns: [
              {
                stack: [
                  { text: 'Customer info:', style: 'sectionHeader' },
                  { text: `Name: ${buyerName}`, margin: [0, 0, 0, 5] },
                  { text: `Company: ${buyerCompany}`, margin: [0, 0, 0, 5] },
                  { text: `Phone: ${buyerPhone}`, margin: [0, 0, 0, 5] },
                  { text: `Email: ${buyerEmail}`, margin: [0, 0, 0, 5] },
                  { text: `Address: ${buyerAddress}`, margin: [0, 0, 0, 5] }
                ],
                width: '50%'
              },
              {
                stack: [
                  { text: 'Summary :', style: 'sectionHeader', alignment: 'right' },
                  { 
                    table: {
                      widths: ['auto', '*'],
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
                    fillColor: '#F5F5F5',
                    margin: [0, 10, 0, 0]
                  }
                ],
                width: '50%'
              }
            ],
            columnGap: 10,
            margin: [0, 0, 0, 20]
          };
          content.push(customerInfo);
    
          // 3. Tableau des produits
          const productsTable: ContentTable = {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Product', style: 'tableHeader', margin: [0, 5, 0, 0] },
                  { text: 'Qty', style: 'tableHeader', margin: [0, 5, 0, 5] },
                  { text: 'Price', style: 'tableHeader', margin: [0, 5, 0, 5] },
                  { text: 'Total', style: 'tableHeader', margin: [0, 5, 0, 5] },
                  { text: 'Tax', style: 'tableHeader', margin: [0, 5, 0, 5] },
                  { text: 'Total(inc. tax)', style: 'tableHeader', margin: [0, 5, 0, 5] }
                ],
                ...bodyRows
              ]
            },
            layout: 'headerLineOnly',
            margin: [0, 0, 0, 10]
          };
          content.push(productsTable);
    
          // 4. Totaux
          const totals: ContentStack = {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 555 - 40, y2: 0, lineWidth: 1 }] },
              { text: `Subtotal: ${totalPrice.toFixed(2)} FCFA`, alignment: 'right', margin: [5, 10, 0, 5] },
              { text: `Tax: ${taxTotal.toFixed(2)} FCFA`, alignment: 'right', margin: [0, 0, 0, 5] },
              { text: `Total: ${totalWithTax.toFixed(2)} FCFA`, bold: true, alignment: 'right', margin: [0, 0, 0, 10] }
            ]
          };
          content.push(totals);
    
          // Définition du document
          const docDefinition: TDocumentDefinitions = {
            content,
            footer: (currentPage: number, pageCount: number) => ({
              text: `Page ${currentPage} of ${pageCount} | Thank you for your purchase! ${copyrightText}`,
              alignment: 'center',
              fontSize: 9,
              margin: [10, 10, 0, 0]
            }),
            styles: {
              header: {
                fontSize: 18,
                bold: true,
                color: '#009cdb',
                margin: [0, 0, 0, 10]
              },
              sectionHeader: {
                fontSize: 14,
                bold: true,
                color: '#8b6404',
                margin: [0, 0, 0, 10]
              },
              tableHeader: {
                bold: true,
                fontSize: 11,
                color: '#FFFFFF',
                fillColor: '#4CAF50',
                alignment: 'center'
              },
              categoryRow: {
                bold: true,
                fontSize: 12,
                color: '#FF9800',
                fillColor: '#F5F5F5',
                margin: [0, 5, 0, 10]
              },
              infoLabel: {
                bold: true,
                margin: [0, 3, 0, 3]
              },
              infoValue: {
                alignment: 'right',
                margin: [0, 3, 0, 3]
              }
            },
            defaultStyle: {
              font: 'Roboto',
              fontSize: 10
            },
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 60]
          };
    
          // Génération du PDF
          return new Promise((resolve, reject) => {
            (pdfMake as any).createPdf(docDefinition).getBuffer((buffer: Buffer) => {
              buffer ? resolve(buffer) : reject(new Error('PDF generation failed'));
            });
          });
    
        } catch (error) {
          console.error('Invoice generation error:', error);
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
        subject: `Votre facture - Commande #${orderNumber}`, // Objet
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

  // Méthode pour extraire les clients uniques à partir des commandes retournées par getOrdersByFarmer()
    async getFarmerClients(farmerId: string): Promise<any> {
      try {
        // Récupérer les commandes de l'agriculteur
        const farmerOrders = await this.getOrdersByFarmer(farmerId);
    
        console.log('Commandes récupérées pour l\'agriculteur :', JSON.stringify(farmerOrders, null, 2));
    
        // Initialiser une Map pour stocker les clients et leurs statistiques
        const clientStats = new Map();
    
        for (const order of farmerOrders) {
          console.log(`Traitement de la commande :`, order);
    
          // Vérifier que l'ordre et ses champs existent
          if (!order || !Array.isArray(order.buyerName) || !Array.isArray(order.buyerEmail)) {
            console.warn('Commande invalide ignorée :', order);
            continue;
          }
    
          const buyerName = order.buyerName.length > 0 ? order.buyerName[0] : '';
          const buyerEmail = order.buyerEmail.length > 0 ? order.buyerEmail[0] : '';
          const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;
    
          console.log(`buyerName extrait : "${buyerName}", buyerEmail extrait : "${buyerEmail}", totalAmount : ${totalAmount}`);
    
          if (buyerName && buyerEmail) {
            // Si le client existe déjà dans la Map, mettre à jour ses statistiques
            if (clientStats.has(buyerEmail)) {
              const client = clientStats.get(buyerEmail);
    
              // Mettre à jour le nombre total de commandes
              client.orderCount += 1;
    
              // Mettre à jour le montant total dépensé
              client.totalSpent += totalAmount;
    
              // Mettre à jour les produits achetés
              for (const productItem of order.products) {
                const productId = productItem.productId;
                const productName = productItem.lib;
                const productCategory = productItem.category;
                const productMesure = productItem.mesure;
                const productQuantity = productItem.quantity;
                const productPrice = productItem.price;
                const productTotal = productItem.total;
    
                // Vérifier si le produit appartient à l'agriculteur
                const foundProduct = await this.productsService.findOne(productId);
                if (foundProduct.fields.farmerId.includes(farmerId)) {
                  // Cumuler les informations sur les produits
                  if (!client.products[productName]) {
                    client.products[productName] = {
                      productId,
                      category: productCategory,
                      //mesure: productMesure,
                      //unitPrice: productPrice,
                      totalQuantity: 0,
                      totalSpent: 0,
                      purchaseCount: 0,
                    };
                  }
    
                  client.products[productName].totalQuantity += productQuantity;
                  client.products[productName].totalSpent += productTotal;
                  client.products[productName].purchaseCount += 1; // Incrémenter correctement le comptage
                }
              }
    
              // Mettre à jour les dates
              if (!client.firstOrderDate || new Date(order.createdDate) < new Date(client.firstOrderDate)) {
                client.firstOrderDate = order.createdDate;
              }
              /*if (!client.lastOrderDate || new Date(order.statusDate) > new Date(client.lastOrderDate)) {
                client.lastOrderDate = order.createdDate;
              }*/
    
              // Mettre à jour le statut des commandes
              if (order.status === 'pending') {
                client.statusDistribution.pending += 1;
              } else if (order.status === 'confirmed') {
                client.statusDistribution.confirmed += 1;
              } else if (order.status === 'delivered') {
                client.statusDistribution.delivered += 1;
              } else if (order.status === 'completed') {
                client.statusDistribution.completed += 1;
              }
            } else {
              // Sinon, ajouter le client avec un compteur initialisé
              const products = {};
              for (const productItem of order.products) {
                const productId = productItem.productId;
                const productName = productItem.lib;
                const productCategory = productItem.category;
                const productMesure = productItem.mesure;
                const productQuantity = productItem.quantity;
                const productPrice = productItem.price;
                const productTotal = productItem.total;
    
                // Vérifier si le produit appartient à l'agriculteur
                const foundProduct = await this.productsService.findOne(productId);
                if (foundProduct.fields.farmerId.includes(farmerId)) {
                  products[productName] = {
                    productId,
                    category: productCategory,
                    //productMesure,
                    //productPrice,
                    totalQuantity: productQuantity,
                    totalSpent: productTotal,
                    purchaseCount: 1, // Initialiser le comptage à 1
                  };
                }
              }
    
              clientStats.set(buyerEmail, {
                buyerName,
                buyerEmail,
                orderCount: 1,
                totalSpent: totalAmount,
                firstOrderDate: order.createdDate,
                //lastOrderDate: order.createdDate,
                products: products,
                statusDistribution: {
                  pending: order.status === 'pending' ? 1 : 0,
                  confirmed: order.status === 'confirmed' ? 1 : 0,
                  delivered: order.status === 'delivered' ? 1 : 0,
                  completed: order.status === 'completed' ? 1 : 0,
                },
              });
            }
          }
        }
    
        // Convertir la Map en tableau avant de retourner les données
        return Array.from(clientStats.values());
      } catch (error) {
        console.error('Erreur lors de la récupération des clients de l\'agriculteur :', error.message);
        throw error; // Propager l'erreur telle quelle
      }
    }
  }