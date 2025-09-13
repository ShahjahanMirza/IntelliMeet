import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';

import { initializeDatabase, cleanupDatabase } from './database/connection.js';
import { errorHandler } from './middleware/errorHandler.js';
import { generalLimiter, apiLimiter, strictLimiter, pollingLimiter } from './middleware/rateLimiter.js';
import { roomRoutes } from './routes/rooms.js';
import { chatRoutes } from './routes/chat.js';
import { signalingRoutes } from './routes/signaling.js';
import { participantRoutes } from './routes/participants.js';
import { setupWebSocketServer } from './services/websocket.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8001;
// Allow multiple common development origins
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',');
  }

  // Default allowed origins for development
  return [
    'http://localhost:3000',   // React default
    'http://localhost:5173',   // Vite default
    'http://localhost:5174',   // Vite default
    'http://localhost:5175',   // Vite default
    'http://localhost:5176',   // Vite default
    'http://localhost:5177',   // Vite default
    'http://localhost:8080',   // Vue CLI default
    'http://localhost:4200',   // Angular default
    'http://127.0.0.1:3000',   // Alternative localhost
    'http://127.0.0.1:5173',   // Alternative localhost
    'http://127.0.0.1:8080',   // Alternative localhost
  ];
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/rooms/join', strictLimiter);
app.use('/api/participants/', pollingLimiter); // Use polling limiter for participant endpoints
app.use('/api/rooms/:id', pollingLimiter); // Use polling limiter for room info endpoint
app.use('/api/signaling/', apiLimiter);

// Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/signaling', signalingRoutes);
app.use('/api/participants', participantRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Setup WebSocket server
const wsCleanup = setupWebSocketServer(wss);

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database connected successfully');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`CORS enabled for: ${CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);

  // Close WebSocket server
  if (wsCleanup) {
    wsCleanup.cleanup();
  }

  // Close database connections
  await cleanupDatabase();

  // Close HTTP server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('Force closing server');
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();
