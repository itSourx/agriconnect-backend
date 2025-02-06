import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ProfilesService } from './profiles.service';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async findAll() {
    return this.profilesService.findAll();
  }

  // Nouvelle route pour rechercher un profil par type
  @Get('type/:type')
  async findOneByType(@Param('type') type: string): Promise<any> {
    return this.profilesService.findOneByType(type);
  }


  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.profilesService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.profilesService.create(data);
  }
  /*@Post()
  @UsePipes(new ValidationPipe())
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }*/

  @Put(':id')
  //@UseGuards(AuthGuard) // Protection avec JWT
  async update(@Param('id') id: string, @Body() data: any) {
    return this.profilesService.update(id, data);
  }

  @Delete(':id')
  //@UseGuards(AuthGuard) // Protection avec JWT
  async delete(@Param('id') id: string) {
    return this.profilesService.delete(id);
  } 
}
