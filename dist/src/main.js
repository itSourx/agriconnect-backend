"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const dotenv = require("dotenv");
const winston = require("winston");
const path = require("path");
const http_exception_filter_1 = require("./filters/http-exception.filter");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
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
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('AgriConnect API')
        .setDescription('Documentation de l\'API AgriConnect')
        .setVersion('1.0')
        .setContact('Support', '#', 'support@sourx.com')
        .setLicense('MIT License', 'https://opensource.org/licenses/MIT')
        .addServer('http://localhost:3000', 'Local Environment')
        .addServer('https://agriconnect-bc17856a61b8.herokuapp.com', 'Production Environment')
        .addTag('auth', 'Endpoints liés à l\'authentification')
        .addTag('users', 'Endpoints liés aux utilisateurs')
        .addTag('products', 'Endpoints liés aux produits')
        .addTag('orders', 'Endpoints liés aux commandes')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
    }, 'JWT')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api-docs', app, document);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    const port = process.env.PORT || 3001;
    app.useLogger(logger);
    const publicDir = path.join(__dirname, '..', 'src', 'public');
    app.useStaticAssets(publicDir);
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    await app.listen(port);
    console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map