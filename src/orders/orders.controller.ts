import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, UsePipes, ValidationPipe, Request, Res, Query,  HttpException, HttpStatus} from '@nestjs/common';
import { Response } from 'express'; // Importez également le type `Response` pour TypeScript
import { OrdersService } from './orders.service';
import { ProductsService } from '../products/products.service'; // Importez ProductsService
import { CreateOrderDto } from './create-order.dto';
import { AuthGuard } from '../auth/auth.guard';
import axios from 'axios';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../users/users.service'; // Importez UsersService

// Définissez les DTO avant le contrôleur
class DateRangeDto {
  startDate?: string;
  endDate?: string;
}

class ProductStatDto {
  productId: string;
  productName: string;
  category: string;
  totalQuantity: number;
  totalRevenue: number;
  percentageOfTotal: number;
}

class OrderStatsResponse {
  success: boolean;
  period: {
    start: string;
    end: string;
  };
  totalOrders: number;
  globalTotalRevenue: number;
  products: ProductStatDto[];
}

@Controller('orders')
export class OrdersController {
  constructor
  (private readonly ordersService: OrdersService,
   private readonly productsService: ProductsService,
   private readonly usersService: UsersService) {}

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

  @Get('stats')
  async getGlobalStatistics(
  @Query() dateRange?: { startDate?: string; endDate?: string }) {
    
    try {
    // 1. Gestion des dates optionnelles
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;

    // 2. Validation des dates si fournies
    if (startDate && isNaN(startDate.getTime())) {
      throw new HttpException('Format de date de début invalide (utilisez YYYY-MM-DD)', HttpStatus.BAD_REQUEST);
    }

    if (endDate && isNaN(endDate.getTime())) {
      throw new HttpException('Format de date de fin invalide (utilisez YYYY-MM-DD)', HttpStatus.BAD_REQUEST);
    }

    // 3. Contrôle de cohérence des dates
    if (startDate && endDate && startDate > endDate) {
      throw new HttpException(
        'La date de début ne peut pas être postérieure à la date de fin', 
        HttpStatus.BAD_REQUEST
      );
    }

    // 4. Contrôle des dates futures
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalisation

    if (startDate && startDate > today) {
      throw new HttpException(
        'La date de début ne peut pas être dans le futur',
        HttpStatus.BAD_REQUEST
      );
    }

    /*if (endDate && endDate > today) {
      throw new HttpException(
        'La date de fin ne peut pas être dans le futur', 
        HttpStatus.BAD_REQUEST
      );
    }*/
      // 5. Récupération des commandes filtrées
      const allOrders = await this.ordersService.findAll();
      if (!allOrders.length) {
        return {
          message: 'Aucune commande trouvée',
          products: []
        };
      }     
      const filteredOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.fields?.createdAt);
        return (
          (!startDate || orderDate >= startDate) &&
          (!endDate || orderDate <= endDate)
        );
      });

      // 6. Calcul des statistiques
      const stats = await this.ordersService.calculateOrderStats(filteredOrders);
      
      return {
        period: {
          start: startDate?.toISOString().split('T')[0] || 'Tous',
          end: endDate?.toISOString().split('T')[0] || 'Tous'
        },
        ...stats
      };

    } catch (error) {
      console.error('Erreur détaillée:', error);
      throw error; 
      //throw new HttpException(error.response?.message || 'Erreur de calcul des statistiques', error.status || HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
 @Get('stats/farmers')
async getFarmerStatistics(
  @Query() dateRange: { startDate?: string; endDate?: string }
) {
  try {
    // Validation des dates (identique à la version globale)
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;

    if (startDate && isNaN(startDate.getTime())) {
      throw new HttpException('Format de date de début invalide', HttpStatus.BAD_REQUEST);
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new HttpException('Format de date de fin invalide', HttpStatus.BAD_REQUEST);
    }
    if (startDate && endDate && startDate > endDate) {
      throw new HttpException('La date de début doit être ultérieure à la date de fin', HttpStatus.BAD_REQUEST);
    }

    // Récupération des commandes filtrées
    const allOrders = await this.ordersService.findAll();
    const filteredOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt || order.fields?.createdAt);
      return (
        (!startDate || orderDate >= startDate) &&
        (!endDate || orderDate <= endDate)
      );
    });

    // Calcul des stats par agriculteur
    const stats = await this.ordersService.calculateFarmerStats(filteredOrders);
    
    return {
      period: {
        start: startDate?.toISOString().split('T')[0] || 'Tous',
        end: endDate?.toISOString().split('T')[0] || 'Tous'
      },
      ...stats
    };

  } catch (error) {
    throw error;
  }
}

@Get('stats/buyers')
async getBuyerStatistics(
  @Query() dateRange: { startDate?: string; endDate?: string }
) {
  try {
    // Validation des dates (identique aux autres endpoints)
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;

    if (startDate && isNaN(startDate.getTime())) {
      throw new HttpException('Format de date de début invalide', HttpStatus.BAD_REQUEST);
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new HttpException('Format de date de fin invalide', HttpStatus.BAD_REQUEST);
    }

    // Récupération des commandes filtrées
    const allOrders = await this.ordersService.findAll();
    const filteredOrders = allOrders.filter(order => {
      const orderDate = new Date(order.createdAt || order.fields?.date);
      return (
        (!startDate || orderDate >= startDate) &&
        (!endDate || orderDate <= endDate)
      );
    });

    // Calcul des stats par acheteur
    const stats = await this.ordersService.calculateBuyerStats(filteredOrders);
    
    return {
      success: true,
      period: {
        start: startDate?.toISOString().split('T')[0] || 'Tous',
        end: endDate?.toISOString().split('T')[0] || 'Tous'
      },
      ...stats
    };

  } catch (error) {
    throw new HttpException(
      error.response?.message || 'Erreur de calcul des statistiques acheteurs',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

@Get('stats/buyers/:buyerId')
async getBuyerDetailedStats(
  @Param('buyerId') buyerId: string,
  @Query() dateRange: { startDate?: string; endDate?: string }
) {
  try {
    // Validation des dates
    const startDate = dateRange?.startDate ? new Date(dateRange.startDate) : null;
    const endDate = dateRange?.endDate ? new Date(dateRange.endDate) : null;

    if (startDate && isNaN(startDate.getTime())) {
      throw new HttpException('Format de date de début invalide', HttpStatus.BAD_REQUEST);
    }
    if (endDate && isNaN(endDate.getTime())) {
      throw new HttpException('Format de date de fin invalide', HttpStatus.BAD_REQUEST);
    }

    // Récupération des commandes filtrées
    const allOrders = await this.ordersService.findAll();
    const filteredOrders = allOrders.filter(order => {
      const isBuyerMatch = order.fields.buyerId[0] === buyerId; // Filtre par acheteur
      const orderDate = new Date(order.createdAt || order.fields?.date);
      return (
        isBuyerMatch &&
        (!startDate || orderDate >= startDate) &&
        (!endDate || orderDate <= endDate)
      );
    });

    if (filteredOrders.length === 0) {
      return {
        message: 'Aucune commande trouvée pour cet acheteur sur la période sélectionnée',
        buyerId,
        period: {
          start: startDate?.toISOString().split('T')[0] || 'Tous',
          end: endDate?.toISOString().split('T')[0] || 'Tous'
        },
        stats: null
      };
    }

    // Calcul des stats détaillées
    const stats = await this.ordersService.calculateSingleBuyerStats(buyerId, filteredOrders);
    
    return {
      success: true,
      buyerId,
      period: {
        start: startDate?.toISOString().split('T')[0] || 'Tous',
        end: endDate?.toISOString().split('T')[0] || 'Tous'
      },
      stats
    };

  } catch (error) {
    throw new HttpException(
      error.response?.message || 'Erreur de calcul des statistiques acheteur',
      error.status || HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
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
  //if (farmerId !== userId || req.user.profile !== 'ADMIN') {
  /*if (req.user.profile !== 'ADMIN' || req.user.profile !== 'SUPERADMIN') {
    throw new Error('Vous n\'êtes pas autorisé(e) à modifier le statut de cette commande.');
  }*/
  const allowedProfiles = ['ADMIN', 'SUPERADMIN'];
  if (!allowedProfiles.includes(req.user.profile)) {
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

  @Post('dashboard')
  async getDashboardStats() {
    try {
      const [products, orders] = await Promise.all([
        this.productsService.findAll(),
        this.ordersService.findAll(),
      ]);

      if (!products.length) {
        return { message: 'No products available' };
      }

      // Définir le type pour les statistiques de catégorie
      interface CategoryStats {
        total: number;
        count: number;
      }
    // 1. Agrégation des données de vente
    interface ProductStats {
      totalQuantity: number;
      totalRevenue: number;
      productName: string;
      category: string;
    }

    const productStats: Record<string, ProductStats> = {};
    let globalTotalAmount = 0;

    await Promise.all(
      orders.map(async (order) => {
        try {
          const payments = await this.ordersService.getOrderPayments(order.id);
          
          payments.forEach(payment => {
            payment.products.forEach(product => {
              if (!product.productId) return;
              
              if (!productStats[product.productId]) {
                productStats[product.productId] = {
                  totalQuantity: 0,
                  totalRevenue: 0,
                  productName: product.lib || 'Nom inconnu',
                  category: product.category || 'Non catégorisé'
                };
              }
              
              productStats[product.productId].totalQuantity += product.quantity || 0;
              productStats[product.productId].totalRevenue += product.total || 0;
              globalTotalAmount += product.total || 0;
            });
          });
          
        } catch (error) {
          console.error(`Erreur commande ${order.id}:`, error.message);
        }
      })
    );

    // 2. Conversion en tableau et tri
    const productsArray = Object.keys(productStats).map(productId => ({
      productId,
      totalQuantity: productStats[productId].totalQuantity,
      totalRevenue: productStats[productId].totalRevenue,
      productName: productStats[productId].productName,
      category: productStats[productId].category
    }));

    // Top 5 par quantité
    const topByQuantity = [...productsArray]
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 5);

    // Top 5 par chiffre d'affaires
    const topByRevenue = [...productsArray]
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 5);

    // 3. Statistiques globales
    const totalProductsSold = productsArray.reduce((sum, p) => sum + p.totalQuantity, 0);
    //const avgProductValue = globalTotalAmount / totalProductsSold;
    const avgProductValue = globalTotalAmount / (totalProductsSold || 1); // Évite division par 0


      // Average price by category
      const categoryStats = products.reduce<Record<string, CategoryStats>>((acc, product) => {
        const category = product.fields?.category || 'Non catégorisé';
        const price = product.fields?.price || 0;
        
        if (!acc[category]) {
          acc[category] = { total: 0, count: 0 };
        }
        
        acc[category].total += price;
        acc[category].count += 1;
        return acc;
      }, {});

      const avgPriceByCategory = Object.entries(categoryStats).map(([category, stats]) => ({
        category,
        averagePrice: stats.total / stats.count,
        productCount: stats.count,
      }));

      // Additional stats from orders
      const totalOrders = orders.length;    
      const totalRevenue = orders.reduce((sum, order) => sum + (order.fields.totalPrice || 0), 0); // Correction ici


      return {
        summary: {
          totalProductsSold,
          globalTotalAmount,
          avgProductValue
        },
        topByQuantity,
        topByRevenue,
        // ... autres métriques si besoin

        //topProducts,
        avgPriceByCategory,
        orderStats: {
          totalOrders,
          totalRevenue,
          avgOrderValue: totalOrders ? totalRevenue / totalOrders : 0,
        },
      };
    } catch (error) {
      throw new HttpException('Failed to load dashboard stats', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  @Get('products-stats')
    async getProductsStats() {
      // Étape 1 : Récupérer toutes les commandes
      const orders = await this.ordersService.findAll();

      // Étape 2 : Récupérer tous les produits
      const products = await this.productsService.findAll();
      const productMap = new Map(products.map(p => [p.id, p]));

      // Étape 3 : Agréger les données
      const stats = {};
      for (const order of orders) {
        for (const item of order.products) {
          const product = productMap.get(item.productId);
          if (!product) continue;

          const productId = product.id;
          if (!stats[productId]) {
            stats[productId] = {
              name: product.name,
              quantity: 0,
              total: 0,
              category: product.category,
            };
          }
          stats[productId].quantity += item.quantity;
          stats[productId].total += item.quantity * product.price;
        }
      }

      // Étape 4 : Convertir en tableau
      return Object.values(stats);
    }
}