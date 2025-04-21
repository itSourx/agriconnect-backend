import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards, UsePipes, ValidationPipe, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './create-order.dto';
import { AuthGuard } from '../auth/auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  async findAll() {
    return this.ordersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

    /*@Post()
    @UsePipes(new ValidationPipe())
    async create(@Body() createOrderDto: CreateOrderDto) {
      return this.ordersService.create(createOrderDto);
    }*/

    @Post()
    @UsePipes(new ValidationPipe())
    @UseGuards(AuthGuard)
    async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    // Récupérer l'ID de l'utilisateur à partir du token JWT
    const buyerId = req.user.id; // L'ID de l'utilisateur est stocké dans le payload JWT
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
  async update(@Param('id') id: string, @Body() data: any) {
    return this.ordersService.update(id, data);
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
  /*const userId = req.user.id;

  // Récupérer la commande existante
  const existingOrder = await this.ordersService.findOne(orderId);

  // Vérifier si l'utilisateur est bien l'agriculteur associé à la commande
  const farmerId = existingOrder.fields.farmerId[0];
  if (farmerId !== userId && req.user.role !== 'ADMIN') {
    throw new Error('Vous n\'êtes pas autorisé à modifier le statut de cette commande.');
  }*/

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
}