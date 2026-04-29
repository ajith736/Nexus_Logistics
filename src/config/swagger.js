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
        'For protected routes, first call a login endpoint, copy the accessToken, then click the Authorize button and paste the token.',
    },
    servers: [
      {
        url: process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`,
        description: 'Current API server',
      },
    ],
    security: [{ bearerAuth: [] }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'Paste only the JWT access token from /api/auth/login, /api/auth/refresh, or /api/auth/agent-login. Swagger sends it as Authorization: Bearer <token>.',
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
