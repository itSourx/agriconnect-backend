import {Controller,Logger, Get, Post, Put, Delete, Param, Body, UsePipes, ValidationPipe, UnauthorizedException, Request, UseGuards, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express'; // Ajoutez cette ligne
import { ProductsService } from './products.service';
import { CreateProductDto } from './create-product.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiConsumes  } from '@nestjs/swagger';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../config/multer.config';
import { Express } from 'express'; // Ajoutez cet import
import { FileInterceptor } from '@nestjs/platform-express'; // Import correct
import { diskStorage } from 'multer';


@ApiTags('products')
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor(private readonly productsService: ProductsService) {}

  // Ajoutez ici les mêmes endpoints que dans UsersController

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

    // Endpoint pour récupérer tous les produits d'un agriculteur
    @Get('findByFarmer/:id')
    @UseGuards(AuthGuard)
    async findByFarmer(@Param('id') id: string): Promise<any[]> {
      return this.productsService.findByFarmer(id);
    }
    
  // Endpoint pour récupérer tous les produits par type
  @Get('by-category/:category')
  async findAllByCategory(@Param('category') category: string): Promise<any[]> {
    return this.productsService.findAllByCategory(category);
  }
  
  @Delete(':id')
  @UseGuards(AuthGuard)
  async delete(@Param('id') id: string) {
    return this.productsService.delete(id);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }


  @Post('add')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('Photo', 5, {
      storage: diskStorage({
        destination: './uploads', // Stocker les fichiers temporairement
        filename: (req, file, callback) => {
          callback(null, `${Date.now()}-${file.originalname}`);
        },
      }),
    })
  )
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() data: CreateProductDto
  ) {
    try {
      // Appeler le service pour créer le produit
      const product = await this.productsService.create(data, files);
      return product;
    } catch (error) {
      console.error('Erreur lors de la création du produit :', error.message);
      throw error;
    }
  }

    @Put(':id') 
    //@UseGuards(AuthGuard)
    @UseInterceptors(
      FileFieldsInterceptor(
        [
          { name: 'Photo', maxCount: 5 }, // Champ pour les photos principales
          { name: 'Gallery', maxCount: 10 }, // Champ pour les images de la galerie
        ],
        {
          storage: diskStorage({
            destination: './uploads', // Dossier temporaire pour les fichiers uploadés
            filename: (req, file, callback) => {
              callback(null, `${Date.now()}-${file.originalname}`);
            },
          }),
        }
      )
    )
    async update(
      @Param('id') id: string, // ID du produit à mettre à jour
      @Body() data: any, // Données textuelles
      @UploadedFiles() files: { Photo?: Express.Multer.File[], Gallery?: Express.Multer.File[] } // Fichiers uploadés
    ) {
      try {
        console.log('Données reçues dans le contrôleur :', data);
        console.log('Fichiers uploadés dans le contrôleur :', files);
  
        const photoFiles = files.Photo || [];
        const galleryFiles = files.Gallery || [];
  
        // Appeler le service pour mettre à jour le produit
        const updatedProduct = await this.productsService.update(id, data, photoFiles, galleryFiles);
        return updatedProduct;
      } catch (error) {
        console.error('Erreur dans le contrôleur :', error.message);
        throw error;
      }
    }

/*  @Post()
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
*/

  // Rechercher des produits
  @Get('search/:query')
  async search(@Param('query') query: string) {
    return this.productsService.search(query);
  }
}