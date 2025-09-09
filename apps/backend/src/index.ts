import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { redisService } from './services/redis';
import { createDefaultAdmin } from './utils/auth';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000"
}));
app.use(express.json());

// Make io available in routes
app.set('io', io);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join event room
  socket.on('joinEvent', (eventId: string) => {
    socket.join(`event:${eventId}`);
    console.log(`User ${socket.id} joined event ${eventId}`);
  });
  
  // Leave event room
  socket.on('leaveEvent', (eventId: string) => {
    socket.leave(`event:${eventId}`);
    console.log(`User ${socket.id} left event ${eventId}`);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ error: 'Route not found' });
});

async function startServer() {
  try {
    // Connect to Redis
    await redisService.connect();
    console.log('Connected to Redis');
    
    // Create default admin user
    await createDefaultAdmin();
    
    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await redisService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await redisService.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

startServer();