import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe, Request, UseInterceptors, UploadedFiles, UploadedFile, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { ChangePasswordDto } from './change-password.dto';
import { AuthGuard } from '../auth/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express'; // Import correct
import { multerOptions } from '../config/multer.config';
import { FilesInterceptor } from '@nestjs/platform-express';



@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private requireAdmin(req: any) {
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user?.profile)) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
  }

  private sanitizeUser(user: any): any {
    if (!user) return user;
    if (Array.isArray(user)) return user.map(item => this.sanitizeUser(item));
    const fields = user.fields || {};
    const { password, resetPassword, ...safeFields } = fields;
    return { ...user, fields: safeFields };
  }

  @Get()
  @UseGuards(AuthGuard)
  async findAll(@Request() req) {
    this.requireAdmin(req);
    return this.sanitizeUser(await this.usersService.findAll());
  }


  @Get('superadmin')
  @UseGuards(AuthGuard)
  async getSuperAdmin(@Request() req) {
    this.requireAdmin(req);
    try {
      const superAdmin = await this.usersService.getSuperAdmin();
      return {compteAdmin:superAdmin.fields.compteOwo};
    } catch (error) {
      console.error('Erreur dans le contrôleur :', error.message);
      throw error;
    }
  }

    // Endpoint pour récupérer tous les produits par profile
    @Get('by-profile/:profile')
    @UseGuards(AuthGuard)
    async findAllByProfile(@Param('profile') profile: string, @Request() req): Promise<any[]> {
      this.requireAdmin(req);
      return this.sanitizeUser(await this.usersService.findAllByProfile(profile));
    }
  

  // Nouvelle route pour rechercher un utilisateur  par email
  @Get('getUserByEmail/:email')
  @UseGuards(AuthGuard)
  async findOneByEmail(@Param('email') email: string, @Request() req): Promise<any> {
    this.requireAdmin(req);
    return this.sanitizeUser(await this.usersService.findOneByEmail(email));
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string, @Request() req) {
    if (req.user?.id !== id) this.requireAdmin(req);
    return this.sanitizeUser(await this.usersService.findOne(id));
  }

  @Post('add/')
  @UseGuards(AuthGuard)
  @UsePipes(new ValidationPipe())
  @UseInterceptors(
    FilesInterceptor('Photo', 5, multerOptions)
  )
async create(
  @UploadedFiles() files: Express.Multer.File[],
  @Body() createUserDto: CreateUserDto, @Request() req) {
  this.requireAdmin(req);
  return this.sanitizeUser(await this.usersService.create(createUserDto, files));  
}

  // Nouvelle méthode : Inscription d'un utilisateur avec email et mot de passe
  @Post('register')
    @UsePipes(new ValidationPipe())
      @UseInterceptors(
        FilesInterceptor('Photo', 5, multerOptions)
      )
    async register(
      @UploadedFiles() files: Express.Multer.File[],
      @Body() createUserDto: CreateUserDto) {
      if (!['AGRICULTEUR', 'ACHETEUR'].includes(createUserDto.profileType)) {
        throw new ForbiddenException('Profil non autorisé à l’inscription.');
      }
      return this.sanitizeUser(await this.usersService.create(createUserDto, files));
  } // <--- Correction ici : Ajout de la fermeture de la parenthèse

  @Put(':id')
  @UseGuards(AuthGuard) // Protection avec JWT
  @UseInterceptors(
    FilesInterceptor('Photo', 5, multerOptions)
  )
  async update(@Param('id') id: string,
  @UploadedFiles() files: Express.Multer.File[], 
  @Body() data: any, @Request() req) {
    if (req.user?.id !== id) this.requireAdmin(req);
    if (!['ADMIN', 'SUPERADMIN'].includes(req.user?.profile)) {
      const { profile, profileType, password, resetPassword, compteOwo, ...safeData } = data;
      return this.sanitizeUser(await this.usersService.update(id, safeData, files));
    }
    return this.sanitizeUser(await this.usersService.update(id, data, files));
  }

  @Delete(':id')
  @UseGuards(AuthGuard) // Protection avec JWT
  async delete(@Param('id') id: string, @Request() req) {
    this.requireAdmin(req);
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
    if (req.user?.id !== id) throw new ForbiddenException('Accès refusé.');
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
  async unlockUser(@Body() body: { email: string }, @Request() req) {
    this.requireAdmin(req);
    const { email } = body;

    if (!email) {
      throw Error('Le mail est requis.');
    }

    return this.usersService.unlockUser(email);
  }

  @Post('lock')
  //@UseGuards(AuthGuard) // Assurez-vous que seul un administrateur peut accéder à cette route
  @UseGuards(AuthGuard)
  async blockUser(@Body() body: { email: string }, @Request() req) {
    this.requireAdmin(req);
    const { email } = body;

    if (!email) {
      throw Error('Le mail est requis.');
    }

    await this.usersService.blockUser(email);
    return { message: 'L\'utilisateur a été bloqué avec succès.' };
  }
}