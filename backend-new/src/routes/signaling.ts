import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError, RTCSignalRequest } from '../types/index.js';

export const signalingRoutes = Router();

// Handle WebRTC signaling
signalingRoutes.post('/rtc', asyncHandler(async (req: Request, res: Response) => {
  const { roomId, participantId, signal }: RTCSignalRequest = req.body;

  if (!roomId || !participantId || !signal) {
    throw new AppError('Room ID, participant ID, and signal are required', 400);
  }

  if (!['offer', 'answer', 'ice-candidate'].includes(signal.type)) {
    throw new AppError('Invalid signal type', 400);
  }

  // In a real implementation, this would relay the signal to the target participant
  // via WebSockets or another real-time mechanism
  // For now, we'll just acknowledge receipt

  console.log(`Received ${signal.type} signal from participant ${participantId} in room ${roomId}`);

  // Here you would typically:
  // 1. Validate the signal data
  // 2. Find the target participant (if specified)
  // 3. Forward the signal via WebSocket
  // 4. Handle any errors or edge cases

  res.json({ success: true });
}));
