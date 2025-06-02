import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, UsePipes, ValidationPipe, Request, Res, Query} from '@nestjs/common';
import { Response } from 'express'; // Importez également le type `Response` pour TypeScript
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';
import { AuthGuard } from '../auth/auth.guard';
import axios from 'axios';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Méthode utilitaire pour obtenir l'URL de base d'Airtable
  private getUrl(): string {
    return `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Orders`;
  }

  // Méthode utilitaire pour obtenir les en-têtes d'authentification
  private getHeaders(): any {
    return {
      Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
  
    @Post()
    @UsePipes(new ValidationPipe())
    @UseGuards(AuthGuard)
    async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // Récupérer l'ID de l'utilisateur à partir du token JWT
    const buyerId = req.user.id; // L'ID de l'utilisateur est stocké dans le payload JWT
    const role = req.user.profile; // Le role de l'utilisateur est stocké dans le payload JWT

    if (role !=='ACHETEUR') {
      throw new Error('Vous n\'êtes pas autorisé(e) à passer une commande.');
    }
      // Ajoutez automatiquement l'ID de l'acheteur
      const orderData = {
        ...createOrderDto,
        buyerId: [buyerId], // Format attendu par Airtable : tableau d'IDs
        //buyerId: req.user.id,
      };
    
      return this.ordersService.create(orderData);
  
    }

  @Put(':id')
  @UseGuards(AuthGuard)
  async update(@Param('id') id: string, @Body() data: any, @Request() req) {

    if (req.user.profile !=='ACHETEUR') {
      throw new Error('Vous n\'êtes pas autorisé(e) à modifier la commande.');
    }

    return this.ordersService.update(id, data);
  }

  @Put('updateOrder/:id')
  //@UseGuards(AuthGuard)
  async updatePayment(@Param('id') id: string, @Body() data: any) {
    console.log('Données reçues dans le contrôleur :', data);
    return this.ordersService.updateFarmerPayment(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.ordersService.delete(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  async updateStatus(@Param('id') orderId: string, @Body('status') status: string,   @Request() req
) {
    try {
  // Récupérer l'ID de l'utilisateur authentifié
  const userId = req.user.id;

  // Récupérer la commande existante
  const existingOrder = await this.ordersService.findOne(orderId);

  // Vérifier si l'utilisateur est bien l'agriculteur associé à la commande
  const farmerId = existingOrder.fields.farmerId[0];
  if (farmerId !== userId || req.user.profile !== 'ADMIN') {
    throw new Error('Vous n\'êtes pas autorisé(e) à modifier le statut de cette commande.');
  }

      // Appeler le service pour mettre à jour le statut de la commande
      return this.ordersService.updateStatus(orderId, status);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de la commande :', error.message);
      throw new Error(error.message);
    }
  }

  
  @Get('byfarmer/:farmerId')
  @UseGuards(AuthGuard)
  async getOrdersByFarmer(@Param('farmerId') farmerId: string, @Request() req) {
    try {
      // Récupérer les commandes pour l'agriculteur
      const farmerOrders = await this.ordersService.getOrdersByFarmer(farmerId);

      return {
        //success: true,
        data: farmerOrders
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes pour l\'agriculteur :', error.message);
      throw new Error('Impossible de récupérer les commandes pour cet agriculteur.');
    }
  }

  @Get('details/:id')
  //@UseGuards(AuthGuard)
  async getOrderPayments(@Param('id') orderId: string) {
    try {
      // Appeler le service pour récupérer les détails des paiements
      const payments = await this.ordersService.getOrderPayments(orderId);
      return payments;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails de paiement :', error.message);
      throw error; // Propager l'erreur telle quelle
    }
  }
  @Post('invoice/:id')
  @UseGuards(AuthGuard)
  async generateAndStoreInvoice(@Param('id') orderId: string) {
    try {
      // Générer la facture PDF en base64
      const pdfBuffer = await this.ordersService.generateInvoice(orderId);
      const base64Content = pdfBuffer.toString('base64'); // Convertir en base64
  
      // Nom du fichier
      const fileName = `invoice_${orderId}.pdf`;
  
      // Vérifier la taille du fichier
      const fileSizeInBytes = Buffer.from(base64Content, 'base64').length;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024); // Convertir en Mo
  
      if (fileSizeInMB > 5) {
        throw new Error('Le fichier PDF est trop volumineux (limite : 5 Mo).');
      }
  
      // Envoyer les données à Airtable
      const response = await axios.patch(
        `${this.getUrl()}/${orderId}`,
        {
          fields: {
            invoice: [
              {
                url: `data:application/pdf;base64,${base64Content}`, // URL avec contenu base64
                filename: fileName, // Nom du fichier
              },
            ],
          },
        },
        { headers: this.getHeaders() }
      );
  
      console.log('Facture enregistrée avec succès :', response.data);
  
      // Construire la réponse à renvoyer au client
      return {
        message: 'Facture générée et enregistrée avec succès.',
        data: {
          orderId,
          invoiceUrl: response.data.fields.invoice[0].url, // URL du fichier PDF dans Airtable
        },
      };
    } catch (error) {
      console.error('Erreur lors de la génération et du stockage de la facture :', error.response?.data || error.message);
      throw Error;//(`Erreur lors de la génération de la facture : ${error.message}`);
    }
  }

@Get('preview-invoice/:id')
async previewInvoice(@Param('id') orderId: string, @Res() res: Response) {
  try {
    // Générer la facture PDF
    const pdfBuffer = await this.ordersService.generateInvoice(orderId);

    // Envoyer le fichier au navigateur
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erreur lors de la prévisualisation de la facture :', error.message);
    res.status(500).send('Erreur lors de la génération de la facture.');
  }
}

@Post('send-invoice/:id')
@UseGuards(AuthGuard)
async sendInvoice(@Param('id') orderId: string) {
  try {
    // Récupérer la commande existante depuis Airtable
    const existingOrder = await this.ordersService.findOne(orderId);

    if (!existingOrder) {
      throw new Error('Commande introuvable.');
    }

    const orderDetails = existingOrder.fields;

    // Extraire l'e-mail de l'acheteur depuis la commande
    const buyerEmail = orderDetails.buyerEmail;

    if (!buyerEmail) {
      throw new Error('Aucun e-mail trouvé pour cette commande.');
    }

    // Envoyer la facture par e-mail
    await this.ordersService.sendInvoiceByEmail(orderId, buyerEmail);

    return {
      message: 'Facture envoyée avec succès.',
      data: {
        orderId,
        email: buyerEmail,
      },
    };
  } catch (error) {
    console.error('Erreur lors de l\'envoi de la facture :', error.message);
    throw Error; //(`Erreur lors de l'envoi de la facture : ${error.message}`);
  }
  }
  
  @Get('getFarmerClients/:farmerId')
  @UseGuards(AuthGuard)
  async getFarmerClients(@Param('farmerId') farmerId: string) {
    try {
      // Appeler le service pour récupérer les clients de l'agriculteur
      const clients = await this.ordersService.getFarmerClients(farmerId);
      return clients;
    } catch (error) {
      console.error('Erreur lors de la récupération des clients de l\'agriculteur :', error.message);
      throw error; // Propager l'erreur telle quelle
    }
  }
}