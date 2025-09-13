import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError, ChatMessage, SendMessageRequest } from '../types/index.js';

export const chatRoutes = Router();

// In-memory storage for chat messages (will be cleared when service restarts)
// In production, you might want to use Redis or a database
const roomMessages = new Map<string, ChatMessage[]>();

// Send a chat message
chatRoutes.post('/send', asyncHandler(async (req: Request, res: Response) => {
  const { roomId, sender, content }: SendMessageRequest = req.body;

  if (!roomId || !sender || !content) {
    throw new AppError('Room ID, sender, and content are required', 400);
  }

  const message: ChatMessage = {
    id: Date.now().toString() + Math.random().toString(36).substring(2),
    roomId,
    sender,
    content,
    timestamp: new Date(),
  };

  if (!roomMessages.has(roomId)) {
    roomMessages.set(roomId, []);
  }

  const messages = roomMessages.get(roomId)!;
  messages.push(message);

  // Keep only last 100 messages per room
  if (messages.length > 100) {
    messages.splice(0, messages.length - 100);
  }

  res.json({ message });
}));

// Get all messages for a room
chatRoutes.get('/:roomId/messages', asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  const messages = roomMessages.get(roomId) || [];
  res.json({ messages });
}));

// Clear messages for a room
chatRoutes.delete('/:roomId/clear', asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  roomMessages.delete(roomId);
  res.json({ success: true });
}));
