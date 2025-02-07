import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { AuthGuard } from '../auth/auth.guard';


@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }



    // Endpoint pour récupérer tous les produits par profile
    @Get('by-profile/:profile')
    async findAllByProfile(@Param('profile') profile: string): Promise<any[]> {
      return this.usersService.findAllByProfile(profile);
    }
  

  // Nouvelle route pour rechercher un utilisateur  par email
  @Get('email/:email')
  async findOneByEmail(@Param('email') email: string): Promise<any> {
    return this.usersService.findOneByEmail(email);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @UsePipes(new ValidationPipe())
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Nouvelle méthode : Inscription d'un utilisateur avec email et mot de passe
  @Post('register') // Endpoint spécifique pour l'inscription
  //async register(@Body() body: { email: string; password: string;}) {
    //return this.usersService.create(body); // Utilise la méthode create existante
    @UsePipes(new ValidationPipe())
    async register(@Body() createUserDto: CreateUserDto) {
      return this.usersService.create(createUserDto);  
  } // <--- Correction ici : Ajout de la fermeture de la parenthèse

  @Put(':id')
  @UseGuards(AuthGuard) // Protection avec JWT
  async update(@Param('id') id: string, @Body() data: any) {
    return this.usersService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(AuthGuard) // Protection avec JWT
  async delete(@Param('id') id: string) {
    return this.usersService.delete(id);
  }
}