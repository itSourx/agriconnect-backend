import {Controller, Get, Post, Put, Delete, Param, Body, UsePipes, ValidationPipe, UnauthorizedException, Request, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './create-product.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';



@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  // Ajoutez ici les mêmes endpoints que dans UsersController

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }
  // Endpoint pour récupérer tous les produits par type
  @Get('by-category/:category')
  async findAllByCategory(@Param('category') category: string): Promise<any[]> {
    return this.productsService.findAllByCategory(category);
  }
  // Rechercher des produits
  @Get('search/:query')
  async search(@Param('query') query: string) {
    return this.productsService.search(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  /*@Post('add/')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe())
   async create(@Body() CreateProductDto: CreateProductDto) {
     return this.productsService.create(CreateProductDto);
   }*/

  @Post('add/')
  @UseGuards(AuthGuard)
   @UsePipes(new ValidationPipe())
     @ApiOperation({ summary: 'Création d\'un produit' }) // Description de l'opération
     @ApiBody({ type: CreateProductDto }) // Modèle du corps de la requête
     @ApiResponse({
       status: 201,
       description: 'Création du produit réussie.',
       schema: {
         example: {
          "id": "rec4GnZPae1E7FLo6",
          "fields":{
          "Name": "Tomates",
          "description": "Naturel sans angrais chimiques",
          "price": 25,
          "quantity": 100,
          "user":[
          "recx5GykDnqXoWY5s"
          ],
          "category": "Fruits",
          "id": "rec4GnZPae1E7FLo6",
          "CreatedDate": "2025-02-15T06:29:40.000Z",
          "profile":[
          "recqZJD9Q1qEyW3AT"
          ],
          "userLastName":[
          "KPADONOU"
          ],
          "userFirstName":[
          "Patrique"
          ],
          "farmerId":[
          "recx5GykDnqXoWY5s"
          ]
          }
          },
       },
     })
     @ApiResponse({ status: 201, description: 'Création du produit réussie.' }) // Réponse en cas de succès
     @ApiResponse({ status: 401, description: 'Aucun token fourni.' }) // Réponse en cas d'échec
     @ApiResponse({ status: 400, description: 'Requête mal envoyée, il manque un paramètre dont la valeur n\'a pas été fournie.' }) // Réponse en cas d'échec


   async create(@Body() CreateProductDto: CreateProductDto, @Request() req) {

    console.log('Utilisateur connecté :', req.user);
    // Afficher les types et valeurs exactes
    console.log('Type de profile :', typeof req.user.profile);
    console.log('Valeur brute de profile :', JSON.stringify(req.user.profile));
    
    if (!req.user || !req.user.profile) {
      throw new UnauthorizedException('Informations utilisateur manquantes.');
    }
      // Vérifiez si l'utilisateur est un agriculteur
    if (req.user.profile.trim() !=='AGRICULTEUR') {
      console.error(`Profile incorrect : ${req.user.profile}`);
      throw new UnauthorizedException('Seul un agriculteur peut ajouter des produits.');
    }
     return this.productsService.create(CreateProductDto);
   }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.productsService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }
}