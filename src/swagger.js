// swagger.js
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'AgriConnect API',
      version: '1.0.0',
      description: 'API documentation for AgriConnect, an online agricultural marketplace',
    },
    servers: [
      {
        url: 'http://localhost:3000/api', // Ajustez l'URL en fonction de votre environnement
      },
    ],
  },
  apis: ['./pages/api/**/*.js'], // Chemin vers vos routes API
};

const specs = swaggerJsDoc(options);

module.exports = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
};