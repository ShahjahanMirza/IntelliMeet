import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index.js';

interface ErrorLogData {
  timestamp: string;
  error: string;
  stack?: string;
  url: string;
  method: string;
  ip?: string;
  userAgent?: string;
  statusCode: number;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';
  let isOperational = false;

  // Handle custom AppError
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
    isOperational = error.isOperational;
  }

  // Handle specific errors
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error: ' + error.message;
    isOperational = true;
  }

  if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    isOperational = true;
  }

  if (error.message.includes('duplicate key')) {
    statusCode = 409;
    message = 'Resource already exists';
    isOperational = true;
  }

  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    isOperational = true;
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    isOperational = true;
  }

  // Rate limiting errors
  if (error.message.includes('Too many requests')) {
    statusCode = 429;
    message = 'Too many requests, please try again later';
    isOperational = true;
  }

  // Log error with additional context
  const logData: ErrorLogData = {
    timestamp: new Date().toISOString(),
    error: error.message,
    url: req.url,
    method: req.method,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    statusCode,
  };

  // Include stack trace for non-operational errors in development
  if (!isOperational || process.env.NODE_ENV === 'development') {
    logData.stack = error.stack;
  }

  // Log based on severity
  if (statusCode >= 500) {
    console.error('Server Error:', JSON.stringify(logData, null, 2));
  } else if (statusCode >= 400) {
    console.warn('Client Error:', JSON.stringify(logData, null, 2));
  }

  // Don't leak error details in production for server errors
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Something went wrong!';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      details: error.message
    }),
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
