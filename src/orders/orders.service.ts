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
//import { TDocumentDefinitions, Content } from 'pdfmake/build/interfaces';
import * as nodemailer from 'nodemailer';


dotenv.config();
interface UpdatedFields {
  status: string;
  farmerPayments?: string; // Champ facultatif pour farmerPayments
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
      
          console.log('Données formatées pour Airtable :', formattedData);

          // Envoyer les données à Airtable
          const response = await axios.post(
            this.getUrl(),
            { records: [{ fields: formattedData }] },
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

    // Récupérer les détails du produit depuis Airtable
    const product = await this.productsService.findOne(productId);

    if (!product) {
      throw Error (`Produit avec l'ID ${productId} introuvable.`);
    }

    const farmerId = product.fields.farmerId[0]; // ID de l'agriculteur (relation)
    const price = product.fields.price || 0; // Prix unitaire
    const lib = product.fields.Name; // Libellé du produit
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
      createdDate: string;
      statusDate: string;
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
          status: fields.status,
          createdDate: formattedDate,
          statusDate: formattedStatusDate,
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
  // Charger les polices nécessaires pour pdfmake
  private loadPdfFonts() {
    // Assigner explicitement les polices à pdfMake
    (pdfMake as any).vfs = pdfFonts.pdfMake.vfs;
  }

  // Méthode pour générer la facture PDF.
  async generateInvoice(orderId: string): Promise<Buffer> {
    this.loadPdfFonts();
  
    try {
      // Récupérer la commande existante
      const existingOrder = await this.findOne(orderId);
  
      if (!existingOrder) {
        throw new Error('Commande introuvable.');
      }
  
      const orderDetails = existingOrder.fields;
  
      // Extraire les informations nécessaires
      //const orderDate = orderDetails.createdAt || 'Date inconnue';
      const buyerName = orderDetails.buyerName || 'Client inconnu';
      const totalPrice = orderDetails.totalPrice || 0;
      const totalProducts = orderDetails.Nbr || 0;


      const products = orderDetails.products || [];
      const quantities = orderDetails.Qty || [];
  
      console.log('Produits bruts :', products);
      console.log('Quantités brutes :', quantities);
  
      // Normaliser les produits et quantités
      const normalizedProducts = Array.isArray(products) ? products : [products];
      let normalizedQuantities = Array.isArray(quantities)
        ? quantities.map(Number)
        : [Number(quantities)];
  
      // Si c'est une chaîne séparée par des virgules, diviser et nettoyer
      if (typeof quantities === 'string') {
        normalizedQuantities = quantities.split(',').map(qty => {
          const parsedQty = Number(qty.trim());
          if (isNaN(parsedQty)) {
            console.error(`Quantité invalide détectée : "${qty}"`);
            return 0; // Remplacer par une valeur par défaut
          }
          return parsedQty;
        });
      }
  
      console.log('Produits normalisés :', normalizedProducts);
      console.log('Quantités normalisées :', normalizedQuantities);
  
      // Vérifier que les produits et les quantités ont la même longueur
      if (normalizedProducts.length !== normalizedQuantities.length) {
        throw new Error('Les données de la commande sont incohérentes.');
      }
            // Formatter la date
           //onst rawDate = fields.createdAt; // Supposons que le champ "date" existe dans Airtable 
            const rawDate =orderDetails.createdAt;
            const formattedDate = rawDate ? format(new Date(rawDate), 'dd/MM/yyyy HH:mm') : 'Date inconnue';
            
      // Construire le contenu de la facture
      const content: any[] = [];
  
      // En-tête de la facture
      content.push({ text: 'FACTURE', style: 'header' });
      content.push({ text: `Commande #${orderId}`, style: 'subheader' });
      content.push({ text: `Acheteur : ${buyerName}`, margin: [0, 0, 0, 5] });
      content.push({ text: `Products : ${totalProducts}`, margin: [0, 0, 0, 5] });
      content.push({ text: `total Price : ${totalPrice} FCFA`, margin: [0, 0, 0, 5] });
 //   content.push({ text: `Date : ${orderDate}`, margin: [0, 0, 0, 15] });
      content.push({ text: `Date : ${formattedDate}`, margin: [0, 0, 0, 15] });



  
      // Détails des produits
      content.push({ text: 'Détails des produits', style: 'sectionHeader' });
  
      const bodyRows: Array<[string, number, string, string]> = [];
      for (let i = 0; i < normalizedProducts.length; i++) {
        const productId = normalizedProducts[i];
        const product = await this.productsService.findOne(productId);
        const productName = product?.fields.Name || 'Produit inconnu';
        const price = product?.fields.price || 0;
        const quantity = normalizedQuantities[i];
  
        console.log(`Produit ID: ${productId}, Nom: ${productName}, Prix: ${price}, Quantité: ${quantity}`);
  
        if (!product) {
          console.warn(`Produit avec l'ID ${productId} introuvable.`);
        }
  
        const total = price * quantity;
  
        // Valider les valeurs
        if (isNaN(total)) {
          console.error(`Le calcul du total a échoué pour le produit ${productName}. Prix: ${price}, Quantité: ${quantity}`);
          throw new Error(`Données invalides pour le produit ${productName}. Prix: ${price}, Quantité: ${quantity}`);
        }
  
        // Ajouter la ligne au tableau
        bodyRows.push([productName, quantity, `${price} FCFA`, `${total} FCFA`]);
      }
  
      content.push({
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto', 'auto'],
          body: [['Produit', 'Quantité', 'Prix unitaire', 'Total'], ...bodyRows],
        },
        margin: [0, 10, 0, 20],
      });
  
      // Pied de page
      content.push({ text: 'Merci pour votre achat !', style: 'footer', margin: [0, 20, 0, 0] });
  
      // Définir le document PDF
      const docDefinition = {
        content,
        styles: {
          header: { fontSize: 22, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
          subheader: { fontSize: 16, bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
          sectionHeader: { fontSize: 14, bold: true, margin: [0, 15, 0, 5] },
          footer: { fontSize: 12, alignment: 'center' },
        },
      };
  
      // Générer le PDF en tant que Buffer
      return new Promise((resolve, reject) => {
        (pdfMake as any).createPdf(docDefinition).getBuffer((buffer: Buffer) => {
          if (buffer) {
          // Sauvegarder le fichier localement pour inspection
          const tempDir = path.join(__dirname, '../temp');
          //const filePath = path.join(__dirname, `../temp/invoice_${orderId}.pdf`);
          const filePath = path.join(tempDir, `invoice_${orderId}.pdf`);

          // Vérifier si le dossier temp existe, sinon le créer
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
            console.log(`Dossier temp créé : ${tempDir}`);
          }

          fs.writeFileSync(filePath, buffer);
          console.log(`Fichier PDF sauvegardé localement : ${filePath}`);
      
          // Convertir en base64 pour Airtable
          //resolve(buffer.toString('base64'));
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
  }
  
  //Méthode pour envoyer l'e-mail avec la pièce jointe.
  async sendInvoiceByEmail(orderId: string, buyerEmail: string): Promise<void> {
    try {
      // Générer le fichier PDF
      const pdfBuffer = await this.generateInvoice(orderId);
      const fileName = `invoice_${orderId}.pdf`;

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
        subject: `Votre facture - Commande #${orderId}`, // Objet
        text: `Bonjour,\n\nVeuillez trouver ci-joint votre facture pour la commande #${orderId}.`, // Contenu texte
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