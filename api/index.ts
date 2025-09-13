import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeDatabase } from '../backend-new/src/database/connection.js';
import { errorHandler } from '../backend-new/src/middleware/errorHandler.js';
import { generalLimiter, apiLimiter, strictLimiter, pollingLimiter } from '../backend-new/src/middleware/rateLimiter.js';
import { roomRoutes } from '../backend-new/src/routes/rooms.js';
import { chatRoutes } from '../backend-new/src/routes/chat.js';
import { signalingRoutes } from '../backend-new/src/routes/signaling.js';
import { participantRoutes } from '../backend-new/src/routes/participants.js';

// Initialize database once
let dbInitialized = false;

const initDB = async () => {
  if (!dbInitialized) {
    try {
      await initializeDatabase();
      dbInitialized = true;
      console.log('Database initialized for serverless function');
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }
};

// Create Express app
const app = express();

// Get CORS origins for production
const getAllowedOrigins = () => {
  if (process.env.CORS_ORIGIN) {
    return process.env.CORS_ORIGIN.split(',');
  }

  // Default allowed origins for development and production
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
    'http://localhost:4200',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:8080',
    'https://*.vercel.app',
    'https://intellimeet.vercel.app'
  ];
};

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    // Check if origin matches allowed origins (including wildcards)
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin.replace(/\*/g, '.*');
        return new RegExp(pattern).test(origin);
      }
      return allowedOrigin === origin;
    });

    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/rooms/join', strictLimiter);
app.use('/api/participants/', pollingLimiter);
app.use('/api/rooms/:id', pollingLimiter);
app.use('/api/signaling/', apiLimiter);

// Routes
app.use('/api/rooms', roomRoutes);
app.use('/api/participants', participantRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/signaling', signalingRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling
app.use(errorHandler);

// Export the handler for Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    // Initialize database on first request
    await initDB();

    // Handle the request
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
