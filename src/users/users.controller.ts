import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe, Request, UseInterceptors, UploadedFiles, UploadedFile } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { ChangePasswordDto } from './change-password.dto';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express'; // Import correct
import { diskStorage } from 'multer';
import { FilesInterceptor } from '@nestjs/platform-express';



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

  @Post('add/')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe())
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  // Nouvelle méthode : Inscription d'un utilisateur avec email et mot de passe
  @Post('register')
    @UsePipes(new ValidationPipe())
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
    async register(
      @UploadedFiles() files: Express.Multer.File[],
      @Body() createUserDto: CreateUserDto) {
      return this.usersService.create(createUserDto, files);  
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

  @Put('change-password/:id')
  @UseGuards(AuthGuard) // Protéger l'endpoint avec AuthGuard
  @UsePipes(new ValidationPipe()) // Valider les données entrantes
  async changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Request() req, // Accéder à la requête via @Request()
  ): Promise<any> {
    const { oldPassword, newPassword } = changePasswordDto;

    // Extraire le token de l'en-tête Authorization
    const token = req.headers.authorization?.split(' ')[1];

    return this.usersService.changePassword(id, oldPassword, newPassword, token);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string }): Promise<any> {
    const { email } = body;

    return this.usersService.resetPassword(email);
  }

  @Post('validate-reset-password')
  //@UseGuards(AuthGuard) // Protéger l'endpoint avec AuthGuard
async validateResetPassword(
  @Body() body: { email: string; temporaryPassword: string; newPassword: string },
  @Request() req, // Accéder à la requête via @Request()
  ): Promise<any> {
  const { email, temporaryPassword, newPassword } = body;

    // Extraire le token de l'en-tête Authorization
    const token = req.headers.authorization?.split(' ')[1];

  return this.usersService.validateResetPassword(email, temporaryPassword, newPassword, token);
}
}