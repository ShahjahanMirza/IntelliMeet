import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from '../types/index.js';

// Validation schemas
export const createRoomSchema = z.object({
  title: z.string()
    .min(1, 'Room title is required')
    .max(100, 'Room title must be less than 100 characters')
    .trim(),
  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .trim()
    .optional(),
  password: z.string()
    .max(50, 'Password must be less than 50 characters')
    .refine((val) => !val || val.length >= 4, {
      message: 'Password must be at least 4 characters'
    })
    .optional(),
  isRecordingEnabled: z.boolean().optional().default(false),
  maxParticipants: z.number()
    .int()
    .min(2, 'Must allow at least 2 participants')
    .max(10, 'Maximum 10 participants allowed')
    .optional()
    .default(10)
});

export const joinRoomSchema = z.object({
  roomId: z.string()
    .min(1, 'Room ID is required')
    .max(20, 'Invalid room ID format')
    .regex(/^[a-z0-9]+$/, 'Room ID contains invalid characters'),
  participantName: z.string()
    .min(1, 'Participant name is required')
    .max(50, 'Name must be less than 50 characters')
    .trim()
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Name contains invalid characters'),
  password: z.string()
    .max(50, 'Password must be less than 50 characters')
    .optional()
});

export const updateParticipantSchema = z.object({
  isAudioEnabled: z.boolean().optional(),
  isVideoEnabled: z.boolean().optional(),
  isScreenSharing: z.boolean().optional()
});

export const sendMessageSchema = z.object({
  roomId: z.string()
    .min(1, 'Room ID is required')
    .max(20, 'Invalid room ID format'),
  sender: z.string()
    .min(1, 'Sender is required')
    .max(50, 'Sender name too long'),
  content: z.string()
    .min(1, 'Message content is required')
    .max(1000, 'Message too long')
    .trim()
});

export const participantActionSchema = z.object({
  hostId: z.string()
    .min(1, 'Host ID is required'),
  mute: z.boolean().optional(),
  enable: z.boolean().optional()
});

export const rtcSignalSchema = z.object({
  roomId: z.string()
    .min(1, 'Room ID is required'),
  participantId: z.string()
    .min(1, 'Participant ID is required'),
  signal: z.object({
    type: z.enum(['offer', 'answer', 'ice-candidate']),
    data: z.any(),
    targetParticipantId: z.string().optional()
  })
});

// Generic validation middleware
export function validateBody(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        throw new AppError(
          `Validation failed: ${errorMessages.map(e => e.message).join(', ')}`,
          400
        );
      }
      next(error);
    }
  };
}

export function validateParams(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        throw new AppError(
          `Invalid parameters: ${errorMessages.map(e => e.message).join(', ')}`,
          400
        );
      }
      next(error);
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        throw new AppError(
          `Invalid query parameters: ${errorMessages.map(e => e.message).join(', ')}`,
          400
        );
      }
      next(error);
    }
  };
}

// Sanitization helpers
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
}

export function sanitizeRoomId(roomId: string): string {
  return roomId.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Parameter validation schemas
export const roomIdParamSchema = z.object({
  id: z.string()
    .min(1, 'Room ID is required')
    .max(20, 'Invalid room ID')
    .regex(/^[a-z0-9]+$/, 'Invalid room ID format')
});

export const participantIdParamSchema = z.object({
  participantId: z.string()
    .min(1, 'Participant ID is required')
    .max(50, 'Invalid participant ID')
});

export const roomIdQuerySchema = z.object({
  roomId: z.string()
    .min(1, 'Room ID is required')
    .max(20, 'Invalid room ID')
});

// Content security middleware
export function contentSecurityPolicy(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data:; " +
    "connect-src 'self' ws: wss:; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  );
  next();
}

// XSS protection
export function xssProtection(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
}
