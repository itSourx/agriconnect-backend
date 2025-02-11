import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
//import { join } from 'path';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as winston from 'winston';
import * as path from 'path'; // Importe path pour gérer les chemins de fichiers

//import { TemplateModule } from './template/template.module';


dotenv.config();
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

async function bootstrap() {
  //const app = await NestFactory.create(AppModule, { logger: ['log', 'error', 'warn', 'debug'] });
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: '*', // Autorise toutes les origines (à ajuster en production)
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  const port = process.env.PORT || 3000;
  app.useLogger(logger);


  // Détermine le chemin vers public/ selon l'environnement
  /*const isProduction = process.env.NODE_ENV === 'production';
  const publicDir = isProduction
    ? path.join(__dirname, 'public') // dist/public/
    : path.join(__dirname, '..', 'src', 'public'); // src/public/

  app.useStaticAssets(publicDir);*/

  // Servir les fichiers statiques depuis /static/
  const publicDir = path.join(__dirname, '..', 'src', 'public');
  app.useStaticAssets(publicDir); //, { prefix: '/static/' }

    // Définir la route racine pour rediriger vers index.html
    /*app.use('/', (req, res) => {
      res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
    });*/

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();