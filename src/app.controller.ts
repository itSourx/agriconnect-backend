import { Controller, Get, Render, Res} from '@nestjs/common';
import { AppService } from './app.service';
import { BlacklistService } from './auth/blacklist.service';
import * as path from 'path'; // Importe path pour gérer les chemins de fichiers
import { Response } from 'express';



@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /*@Get()
  getHello(): string {
    return this.appService.getHello();
  }*/

  /*@Get()
  @Render('home') // Utilise le template home.hbs
  getHello() {
    return { 
      title: 'Accueil',
      features: this.appService.getFeatures()
    };
  }*/

    @Get('/')
    root(@Res() res: Response) {
      res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
    }
}
