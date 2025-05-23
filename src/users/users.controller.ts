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


  @Get('superadmin')
  async getSuperAdmin() {
    try {
      const superAdmin = await this.usersService.getSuperAdmin();
      return superAdmin;
    } catch (error) {
      console.error('Erreur dans le contrôleur :', error.message);
      throw error;
    }
  }

    // Endpoint pour récupérer tous les produits par profile
    @Get('by-profile/:profile')
    async findAllByProfile(@Param('profile') profile: string): Promise<any[]> {
      return this.usersService.findAllByProfile(profile);
    }
  

  // Nouvelle route pour rechercher un utilisateur  par email
  @Get('getUserByEmail/:email')
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
  @Body() createUserDto: CreateUserDto) {
  return this.usersService.create(createUserDto, files);  
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
  async update(@Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[], 
  @Body() data: any) {
    return this.usersService.update(id, data, files);
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
  async resetPassword(
    @Body() body: { email: string },
    @Request() req,): Promise<any> {
    const { email } = body;

    // Extraire le token de l'en-tête Authorization
    const token = req.headers.authorization?.split(' ')[1];

    return this.usersService.resetPassword(email, token);
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

  @Post('unlock')
  //@UseGuards(AdminGuard) // Assurez-vous que seul un administrateur peut accéder à cette route
  @UseGuards(AuthGuard)
  async unlockUser(@Body() body: { email: string }) {
    const { email } = body;

    if (!email) {
      throw Error('Le mail est requis.');
    }

    return this.usersService.unlockUser(email);
  }

  @Post('lock')
  //@UseGuards(AuthGuard) // Assurez-vous que seul un administrateur peut accéder à cette route
  @UseGuards(AuthGuard)
  async blockUser(@Body() body: { email: string }) {
    const { email } = body;

    if (!email) {
      throw Error('Le mail est requis.');
    }

    await this.usersService.blockUser(email);
    return { message: 'L\'utilisateur a été bloqué avec succès.' };
  }
}