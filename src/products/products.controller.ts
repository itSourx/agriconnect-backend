import {Controller, Get, Post, Put, Delete, Param, Body, UsePipes, ValidationPipe, UnauthorizedException, Request, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './create-product.dto';
import { AuthGuard } from '../auth/auth.guard';



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

  /*@Post('add/')
  @UseGuards(AuthGuard)
  async create(@Body() data: any) {
    // Vérifiez si l'utilisateur est un agriculteur
    /*if (req.user.profile !== 'AGRICULTEUR') {
      throw new UnauthorizedException('Seul un agriculteur peut ajouter des produits.');
    }
    return this.productsService.create(data);
  }*/

  @Post('add/')
  @UseGuards(AuthGuard)
   @UsePipes(new ValidationPipe())
   async create(@Body() CreateProductDto: CreateProductDto, @Request() req) {

    console.log('Utilisateur connecté :', req.user);

    /*if (!req.user) {
      throw new UnauthorizedException('Utilisateur manquant.');
    }

    if (!req.user.profile) {
      throw new UnauthorizedException('Profile manquant.');
    }*/


    // Vérifiez si l'utilisateur est un agriculteur
    if (req.user.profile !== 'AGRICULTEUR') {
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