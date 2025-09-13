import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../database/connection.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError, CreateRoomRequest, JoinRoomRequest, Room, JoinRoomResponse, CheckTimeoutResponse } from '../types/index.js';
import {
  validateBody,
  validateParams,
  createRoomSchema,
  joinRoomSchema,
  roomIdParamSchema,
  sanitizeString,
  sanitizeRoomId
} from '../middleware/validation.js';

export const roomRoutes = Router();

// Create a new room
roomRoutes.post('/', validateBody(createRoomSchema), asyncHandler(async (req: Request, res: Response) => {
  const { title, description, password, isRecordingEnabled, maxParticipants }: CreateRoomRequest = req.body;

  // Sanitize inputs
  const sanitizedTitle = sanitizeString(title);
  const sanitizedDescription = description ? sanitizeString(description) : null;

  const roomId = generateRoomId();
  const cappedMaxParticipants = Math.min(maxParticipants || 10, 10);

  const query = `
    INSERT INTO rooms (id, title, description, password, is_recording_enabled, max_participants, created_at, is_active, creator_id)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 1, ?)
  `;

  const creatorId = generateParticipantId();
  const values = [
    roomId,
    sanitizedTitle,
    sanitizedDescription,
    password || null,
    isRecordingEnabled || false,
    cappedMaxParticipants,
    creatorId
  ];

  const room = await pool.insertAndReturn(query, values, 'rooms', 'id', roomId);

  // Automatically add creator as the first participant and host
  const participantQuery = `
    INSERT INTO participants (id, room_id, name, joined_at, is_host)
    VALUES (?, ?, ?, datetime('now'), 1)
  `;

  await pool.query(participantQuery, [creatorId, roomId, 'Host']);

  const response: Room & { creatorId: string } = {
    id: room.id,
    title: room.title,
    description: room.description,
    hasPassword: !!room.password,
    isRecordingEnabled: room.is_recording_enabled,
    maxParticipants: room.max_participants,
    createdAt: room.created_at,
    isActive: room.is_active,
    creatorId: creatorId,
  };

  res.status(201).json(response);
}));

// Get room details
roomRoutes.get('/:id', validateParams(roomIdParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const roomQuery = `
    SELECT id, title, description, password, is_recording_enabled, max_participants, created_at, is_active, creator_id
    FROM rooms
    WHERE id = ?
  `;

  const roomResult = await pool.query(roomQuery, [id]);

  if (roomResult.rows.length === 0) {
    throw new AppError('Room not found', 404);
  }

  const room = roomResult.rows[0];

  const participantCountQuery = `
    SELECT COUNT(*) as count
    FROM participants
    WHERE room_id = ? AND left_at IS NULL
  `;

  const participantCountResult = await pool.query(participantCountQuery, [id]);
  const participantCount = parseInt(participantCountResult.rows[0].count);

  const response: Room = {
    id: room.id,
    title: room.title,
    description: room.description,
    hasPassword: !!room.password,
    isRecordingEnabled: room.is_recording_enabled,
    maxParticipants: room.max_participants,
    createdAt: room.created_at,
    isActive: room.is_active,
    participantCount,
  };

  res.json(response);
}));

// Join a room
roomRoutes.post('/join', validateBody(joinRoomSchema), asyncHandler(async (req: Request, res: Response) => {
  const { roomId, participantName, password }: JoinRoomRequest = req.body;

  // Sanitize inputs
  const sanitizedRoomId = sanitizeRoomId(roomId);
  const sanitizedParticipantName = sanitizeString(participantName);

  // Check if room exists and is active
  const roomQuery = `
    SELECT id, title, description, password, is_recording_enabled, max_participants, is_active, creator_id
    FROM rooms
    WHERE id = ?
  `;

  const roomResult = await pool.query(roomQuery, [sanitizedRoomId]);

  if (roomResult.rows.length === 0) {
    throw new AppError('Room not found', 404);
  }

  const room = roomResult.rows[0];

  if (!room.is_active) {
    throw new AppError('Room is no longer active', 410);
  }

  if (room.password && room.password !== password) {
    throw new AppError('Invalid room password', 403);
  }

  // Check room capacity
  const participantCountQuery = `
    SELECT COUNT(*) as count
    FROM participants
    WHERE room_id = ? AND left_at IS NULL
  `;

  const participantCountResult = await pool.query(participantCountQuery, [sanitizedRoomId]);
  const participantCount = parseInt(participantCountResult.rows[0].count);

  if (participantCount >= room.max_participants) {
    throw new AppError('Room is full', 409);
  }

  // Check if participant with same name already exists (for creator case)
  const existingParticipantQuery = `
    SELECT id, name, is_host, joined_at
    FROM participants
    WHERE room_id = ? AND name = ? AND left_at IS NULL
  `;
  const existingResult = await pool.query(existingParticipantQuery, [sanitizedRoomId, sanitizedParticipantName]);

  let participant;

  if (existingResult.rows.length > 0) {
    // Participant already exists (likely the creator), return existing participant
    participant = existingResult.rows[0];
  } else {
    // Add new participant
    const participantId = generateParticipantId();

    // Check if there's already a host in the room
    const hostCheckQuery = `
      SELECT COUNT(*) as host_count
      FROM participants
      WHERE room_id = ? AND is_host = 1 AND left_at IS NULL
    `;
    const hostCheckResult = await pool.query(hostCheckQuery, [sanitizedRoomId]);
    const hostCount = parseInt(hostCheckResult.rows[0].host_count);

    // User becomes host only if no host exists
    const shouldBeHost = (hostCount === 0);

    const participantQuery = `
      INSERT INTO participants (id, room_id, name, joined_at, is_host)
      VALUES (?, ?, ?, datetime('now'), ?)
    `;

    participant = await pool.insertAndReturn(participantQuery, [participantId, sanitizedRoomId, sanitizedParticipantName, shouldBeHost ? 1 : 0], 'participants', 'id', participantId);
  }

  const response: JoinRoomResponse = {
    success: true,
    room: {
      id: room.id,
      title: room.title,
      description: room.description,
      isRecordingEnabled: room.is_recording_enabled,
      maxParticipants: room.max_participants,
    },
    participant: {
      id: participant.id,
      name: participant.name,
      joinedAt: participant.joined_at,
      isHost: Boolean(participant.is_host),
    },
  };

  res.json(response);
}));

// Leave a room
roomRoutes.post('/leave', asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.body;

  if (!participantId) {
    throw new AppError('Participant ID is required', 400);
  }

  const query = `
    UPDATE participants
    SET left_at = datetime('now')
    WHERE id = ? AND left_at IS NULL
  `;

  await pool.query(query, [participantId]);

  res.json({ success: true });
}));

// Check room timeout
roomRoutes.get('/:roomId/timeout', validateParams(z.object({ roomId: z.string().min(1) })), asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  const roomQuery = `
    SELECT created_at
    FROM rooms
    WHERE id = ? AND is_active = 1
  `;

  const roomResult = await pool.query(roomQuery, [roomId]);

  if (roomResult.rows.length === 0) {
    const response: CheckTimeoutResponse = { shouldClose: true, remainingMinutes: 0 };
    return res.json(response);
  }

  const room = roomResult.rows[0];

  // Parse the SQLite datetime string properly
  let createdAt: Date;
  if (typeof room.created_at === 'string') {
    // SQLite returns datetime as 'YYYY-MM-DD HH:MM:SS'
    createdAt = new Date(room.created_at.replace(' ', 'T') + 'Z');
  } else {
    createdAt = new Date(room.created_at);
  }

  const now = new Date();
  const minutesElapsed = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
  const remainingMinutes = Math.max(0, 30 - minutesElapsed);

  console.log(`Room ${roomId}: Created at ${room.created_at}, Now: ${now.toISOString()}, Minutes elapsed: ${minutesElapsed}`);

  if (minutesElapsed >= 30) {
    // Auto-close the room
    await pool.query('UPDATE rooms SET is_active = 0 WHERE id = ?', [roomId]);

    // Mark all participants as left
    await pool.query(
      'UPDATE participants SET left_at = datetime(\'now\') WHERE room_id = ? AND left_at IS NULL',
      [roomId]
    );

    const response: CheckTimeoutResponse = { shouldClose: true, remainingMinutes: 0 };
    return res.json(response);
  }

  const response: CheckTimeoutResponse = { shouldClose: false, remainingMinutes };
  res.json(response);
}));

// End meeting (host only)
roomRoutes.post('/:roomId/end', validateParams(z.object({ roomId: z.string().min(1) })), validateBody(z.object({ participantId: z.string().min(1) })), asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { participantId } = req.body;

  if (!participantId) {
    throw new AppError('Participant ID is required', 400);
  }

  // Check if participant is the host
  const hostCheckQuery = `
    SELECT is_host
    FROM participants
    WHERE id = ? AND room_id = ? AND left_at IS NULL
  `;

  const hostResult = await pool.query(hostCheckQuery, [participantId, roomId]);

  if (hostResult.rows.length === 0) {
    throw new AppError('Participant not found', 404);
  }

  if (!hostResult.rows[0].is_host) {
    throw new AppError('Only the host can end the meeting', 403);
  }

  // End the meeting
  await pool.query('UPDATE rooms SET is_active = 0 WHERE id = ?', [roomId]);

  // Mark all participants as left
  await pool.query(
    'UPDATE participants SET left_at = datetime(\'now\') WHERE room_id = ? AND left_at IS NULL',
    [roomId]
  );

  res.json({ success: true, message: 'Meeting ended successfully' });
}));

// Debug endpoint to check participant status
roomRoutes.get('/:roomId/debug', validateParams(z.object({ roomId: z.string().min(1) })), asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  const roomQuery = `
    SELECT id, title, creator_id, is_active
    FROM rooms
    WHERE id = ?
  `;

  const participantsQuery = `
    SELECT id, name, is_host, joined_at, left_at
    FROM participants
    WHERE room_id = ?
    ORDER BY joined_at
  `;

  const [roomResult, participantsResult] = await Promise.all([
    pool.query(roomQuery, [roomId]),
    pool.query(participantsQuery, [roomId])
  ]);

  res.json({
    room: roomResult.rows[0] || null,
    participants: participantsResult.rows,
    activeParticipants: participantsResult.rows.filter(p => !p.left_at),
    participantCount: participantsResult.rows.filter(p => !p.left_at).length
  });
}));

function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function generateParticipantId(): string {
  return Math.random().toString(36).substring(2, 15);
}
