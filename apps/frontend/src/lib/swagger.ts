import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'The Draw Lottery API',
      version: '1.0.0',
      description: 'API documentation for The Draw lottery system',
    },
    servers: [
      {
        url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Admin: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            registrationOpen: { type: 'boolean' },
            closed: { type: 'boolean' },
            qrCode: { type: 'string' },
          },
        },
        Participant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            eventId: { type: 'string' },
            name: { type: 'string' },
            registeredAt: { type: 'string', format: 'date-time' },
          },
        },
        Winner: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            eventId: { type: 'string' },
            participantId: { type: 'string' },
            participantName: { type: 'string' },
            drawOrder: { type: 'number' },
            drawnAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          summary: 'Health check',
          responses: {
            '200': {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                      timestamp: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Admin login',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                  required: ['username', 'password'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      admin: { $ref: '#/components/schemas/Admin' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/events': {
        get: {
          summary: 'Get all events for admin',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of events',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/Event' },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        post: {
          summary: 'Create new event',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                  },
                  required: ['name'],
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Event created',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Event' },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/api/events/{eventId}': {
        get: {
          summary: 'Get event details',
          parameters: [
            {
              name: 'eventId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Event details',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Event' },
                },
              },
            },
            '404': {
              description: 'Event not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete event',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'eventId',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '200': {
              description: 'Event deleted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
            '404': {
              description: 'Event not found',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/app/api/**/*.ts'], // Path to the API files
};

export const swaggerSpec = swaggerJsdoc(options);