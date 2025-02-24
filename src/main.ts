import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
//import { join } from 'path';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as winston from 'winston';
import * as path from 'path'; // Importe path pour gérer les chemins de fichiers
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

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

    // Configuration de Swagger
    const config = new DocumentBuilder()
    .setTitle('AgriConnect API') // Titre de l'API
    .setDescription('Documentation de l\'API AgriConnect') // Description
    .setVersion('1.0') // Version de l'API
    .setContact('Support', '#', 'support@sourx.com')
    .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Local Environment')
    .addServer('https://agriconnect-bc17856a61b8.herokuapp.com', 'Production Environment')
    .addTag('auth', 'Endpoints liés à l\'authentification') // Tags pour organiser les endpoints
    .addTag('users', 'Endpoints liés aux utilisateurs')
    .addTag('products', 'Endpoints liés aux produits')
    .addTag('orders', 'Endpoints liés aux commandes')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT', // Nom du token JWT dans Swagger
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document); // URL pour accéder à Swagger


    // Activer les pipes de validation globaux
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Supprime les propriétés non définies dans le DTO
        forbidNonWhitelisted: true, // Lance une erreur si des propriétés inconnues sont envoyées
      }),
    );

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

  // Ajouter un filtre d'exception global
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();