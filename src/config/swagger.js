const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Nexus Logistics API',
      version: '1.0.0',
      description:
        'REST API for organizations, dispatchers, agents, orders, and CSV bulk uploads. ' +
        'Authenticated routes require `Authorization: Bearer <accessToken>`.',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access token from /api/auth/login, /api/auth/refresh, or /api/auth/agent-login.',
        },
      },
    },
  },
  apis: [
    path.join(__dirname, '..', 'routes', '*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
