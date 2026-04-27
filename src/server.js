require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const { connectDB } = require('./config/db');
const { initSocket, getIO } = require('./config/socket');
const { getRedisConnection, isRedisEnabled } = require('./config/redis');
const { startUploadWorker, closeUploadWorker } = require('./queues/upload.worker');
const errorHandler = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const organizationRoutes = require('./routes/organization.routes');
const userRoutes = require('./routes/user.routes');
const agentRoutes = require('./routes/agent.routes');
const orderRoutes = require('./routes/order.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Nexus Logistics API Docs',
    swaggerOptions: { persistAuthorization: true, docExpansion: 'list', filter: true },
  })
);

app.use('/api', generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/uploads', uploadRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    initSocket(server);

    if (isRedisEnabled()) {
      getRedisConnection();
      startUploadWorker();
    } else {
      console.log('Redis disabled (REDIS_ENABLED=false) — BullMQ queues/workers will not start.');
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

function gracefulShutdown(signal) {
  console.log(`\n${signal} received — shutting down gracefully...`);
  server.close(async () => {
    try {
      try {
        const io = getIO();
        io.disconnectSockets(true);
        io.close();
        console.log('Socket.io server closed');
      } catch {
        /* Socket.io may not be initialized */
      }

      try {
        await closeUploadWorker();
      } catch {
        /* Worker may not be running */
      }

      try {
        if (isRedisEnabled()) {
          const redis = getRedisConnection();
          if (redis) {
            await redis.quit();
            console.log('Redis connection closed');
          }
        }
      } catch {
        /* Redis may not be connected */
      }

      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('MongoDB connection closed');

      console.log('Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err.message);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('Forced shutdown — timeout exceeded');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = { app, server };
