import { Router, Request, Response } from 'express';
import { pool } from '../database/connection.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError, Participant, UpdateParticipantRequest } from '../types/index.js';

export const participantRoutes = Router();

// Get all participants in a room
participantRoutes.get('/room/:roomId', asyncHandler(async (req: Request, res: Response) => {
  const { roomId } = req.params;

  const query = `
    SELECT id, name, joined_at as joinedAt, is_audio_enabled as isAudioEnabled,
           is_video_enabled as isVideoEnabled, is_screen_sharing as isScreenSharing,
           is_host as isHost
    FROM participants
    WHERE room_id = ? AND left_at IS NULL
    ORDER BY joined_at ASC
  `;

  const result = await pool.query(query, [roomId]);
  const participants: Participant[] = result.rows.map(row => ({
    ...row,
    isHost: Boolean(row.isHost),
    isAudioEnabled: Boolean(row.isAudioEnabled),
    isVideoEnabled: Boolean(row.isVideoEnabled),
    isScreenSharing: Boolean(row.isScreenSharing),
  }));

  res.json({ participants });
}));

// Update participant settings
participantRoutes.put('/:participantId', asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const { isAudioEnabled, isVideoEnabled, isScreenSharing }: UpdateParticipantRequest = req.body;

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (isAudioEnabled !== undefined) {
    updates.push(`is_audio_enabled = ?`);
    values.push(isAudioEnabled);
  }

  if (isVideoEnabled !== undefined) {
    updates.push(`is_video_enabled = ?`);
    values.push(isVideoEnabled);
  }

  if (isScreenSharing !== undefined) {
    updates.push(`is_screen_sharing = ?`);
    values.push(isScreenSharing);
  }

  if (updates.length === 0) {
    throw new AppError('No updates provided', 400);
  }

  values.push(participantId);
  const query = `UPDATE participants SET ${updates.join(', ')} WHERE id = ?`;

  const result = await pool.update(query, values);

  if (result.rowCount === 0) {
    throw new AppError('Participant not found', 404);
  }

  res.json({ success: true });
}));

// Host-only: Kick a participant from the room
participantRoutes.post('/:participantId/kick', asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const { hostId } = req.body;

  if (!hostId) {
    throw new AppError('Host ID is required', 400);
  }

  // Verify the requester is a host
  const hostCheckQuery = `
    SELECT p.is_host, p.room_id
    FROM participants p
    WHERE p.id = ? AND p.left_at IS NULL
  `;

  const hostResult = await pool.query(hostCheckQuery, [hostId]);

  if (hostResult.rows.length === 0) {
    throw new AppError('Host not found or not active', 404);
  }

  if (!hostResult.rows[0].is_host) {
    throw new AppError('Only hosts can kick participants', 403);
  }

  const roomId = hostResult.rows[0].room_id;

  // Verify the participant to kick is in the same room
  const participantCheckQuery = `
    SELECT room_id, is_host
    FROM participants
    WHERE id = ? AND left_at IS NULL
  `;

  const participantResult = await pool.query(participantCheckQuery, [participantId]);

  if (participantResult.rows.length === 0) {
    throw new AppError('Participant not found or already left', 404);
  }

  if (participantResult.rows[0].room_id !== roomId) {
    throw new AppError('Participant is not in the same room', 400);
  }

  // Prevent hosts from kicking other hosts
  if (participantResult.rows[0].is_host) {
    throw new AppError('Cannot kick another host', 403);
  }

  // Kick the participant
  const kickQuery = `
    UPDATE participants
    SET left_at = datetime('now')
    WHERE id = ? AND left_at IS NULL
  `;

  await pool.query(kickQuery, [participantId]);

  res.json({ success: true, message: 'Participant kicked successfully' });
}));

// Host-only: Mute/unmute a participant
participantRoutes.post('/:participantId/mute', asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const { hostId, mute } = req.body;

  if (!hostId) {
    throw new AppError('Host ID is required', 400);
  }

  if (typeof mute !== 'boolean') {
    throw new AppError('Mute parameter must be a boolean', 400);
  }

  // Verify the requester is a host
  const hostCheckQuery = `
    SELECT p.is_host, p.room_id
    FROM participants p
    WHERE p.id = ? AND p.left_at IS NULL
  `;

  const hostResult = await pool.query(hostCheckQuery, [hostId]);

  if (hostResult.rows.length === 0) {
    throw new AppError('Host not found or not active', 404);
  }

  if (!hostResult.rows[0].is_host) {
    throw new AppError('Only hosts can mute participants', 403);
  }

  const roomId = hostResult.rows[0].room_id;

  // Verify the participant is in the same room
  const participantCheckQuery = `
    SELECT room_id, is_host
    FROM participants
    WHERE id = ? AND left_at IS NULL
  `;

  const participantResult = await pool.query(participantCheckQuery, [participantId]);

  if (participantResult.rows.length === 0) {
    throw new AppError('Participant not found or already left', 404);
  }

  if (participantResult.rows[0].room_id !== roomId) {
    throw new AppError('Participant is not in the same room', 400);
  }

  // Prevent hosts from muting other hosts
  if (participantResult.rows[0].is_host) {
    throw new AppError('Cannot mute another host', 403);
  }

  // Mute/unmute the participant
  const muteQuery = `
    UPDATE participants
    SET is_audio_enabled = ?
    WHERE id = ? AND left_at IS NULL
  `;

  await pool.query(muteQuery, [!mute, participantId]);

  res.json({
    success: true,
    message: `Participant ${mute ? 'muted' : 'unmuted'} successfully`
  });
}));

// Host-only: Control participant video
participantRoutes.post('/:participantId/video', asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const { hostId, enable } = req.body;

  if (!hostId) {
    throw new AppError('Host ID is required', 400);
  }

  if (typeof enable !== 'boolean') {
    throw new AppError('Enable parameter must be a boolean', 400);
  }

  // Verify the requester is a host
  const hostCheckQuery = `
    SELECT p.is_host, p.room_id
    FROM participants p
    WHERE p.id = ? AND p.left_at IS NULL
  `;

  const hostResult = await pool.query(hostCheckQuery, [hostId]);

  if (hostResult.rows.length === 0) {
    throw new AppError('Host not found or not active', 404);
  }

  if (!hostResult.rows[0].is_host) {
    throw new AppError('Only hosts can control participant video', 403);
  }

  const roomId = hostResult.rows[0].room_id;

  // Verify the participant is in the same room
  const participantCheckQuery = `
    SELECT room_id, is_host
    FROM participants
    WHERE id = ? AND left_at IS NULL
  `;

  const participantResult = await pool.query(participantCheckQuery, [participantId]);

  if (participantResult.rows.length === 0) {
    throw new AppError('Participant not found or already left', 404);
  }

  if (participantResult.rows[0].room_id !== roomId) {
    throw new AppError('Participant is not in the same room', 400);
  }

  // Prevent hosts from controlling other hosts
  if (participantResult.rows[0].is_host) {
    throw new AppError('Cannot control another host\'s video', 403);
  }

  // Control participant video
  const videoQuery = `
    UPDATE participants
    SET is_video_enabled = ?
    WHERE id = ? AND left_at IS NULL
  `;

  await pool.query(videoQuery, [enable, participantId]);

  res.json({
    success: true,
    message: `Participant video ${enable ? 'enabled' : 'disabled'} successfully`
  });
}));

// Host-only: Control participant screen sharing
participantRoutes.post('/:participantId/screenshare', asyncHandler(async (req: Request, res: Response) => {
  const { participantId } = req.params;
  const { hostId, enable } = req.body;

  if (!hostId) {
    throw new AppError('Host ID is required', 400);
  }

  if (typeof enable !== 'boolean') {
    throw new AppError('Enable parameter must be a boolean', 400);
  }

  // Verify the requester is a host
  const hostCheckQuery = `
    SELECT p.is_host, p.room_id
    FROM participants p
    WHERE p.id = ? AND p.left_at IS NULL
  `;

  const hostResult = await pool.query(hostCheckQuery, [hostId]);

  if (hostResult.rows.length === 0) {
    throw new AppError('Host not found or not active', 404);
  }

  if (!hostResult.rows[0].is_host) {
    throw new AppError('Only hosts can control participant screen sharing', 403);
  }

  const roomId = hostResult.rows[0].room_id;

  // Verify the participant is in the same room
  const participantCheckQuery = `
    SELECT room_id, is_host
    FROM participants
    WHERE id = ? AND left_at IS NULL
  `;

  const participantResult = await pool.query(participantCheckQuery, [participantId]);

  if (participantResult.rows.length === 0) {
    throw new AppError('Participant not found or already left', 404);
  }

  if (participantResult.rows[0].room_id !== roomId) {
    throw new AppError('Participant is not in the same room', 400);
  }

  // Prevent hosts from controlling other hosts
  if (participantResult.rows[0].is_host) {
    throw new AppError('Cannot control another host\'s screen sharing', 403);
  }

  // Control participant screen sharing
  const screenShareQuery = `
    UPDATE participants
    SET is_screen_sharing = ?
    WHERE id = ? AND left_at IS NULL
  `;

  await pool.query(screenShareQuery, [enable, participantId]);

  res.json({
    success: true,
    message: `Participant screen sharing ${enable ? 'enabled' : 'disabled'} successfully`
  });
}));
