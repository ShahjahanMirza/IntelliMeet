// Room Types
export interface CreateRoomRequest {
  title: string;
  description?: string;
  password?: string;
  isRecordingEnabled?: boolean;
  maxParticipants?: number;
}

export interface Room {
  id: string;
  title: string;
  description?: string;
  hasPassword: boolean;
  isRecordingEnabled: boolean;
  maxParticipants: number;
  createdAt: Date;
  isActive: boolean;
  participantCount?: number;
}

// Participant Types
export interface Participant {
  id: string;
  name: string;
  joinedAt: Date;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
}

export interface JoinRoomRequest {
  roomId: string;
  participantName: string;
  password?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  room: {
    id: string;
    title: string;
    description?: string;
    isRecordingEnabled: boolean;
    maxParticipants: number;
  };
  participant: {
    id: string;
    name: string;
    joinedAt: Date;
    isHost: boolean;
  };
}

export interface UpdateParticipantRequest {
  participantId: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing?: boolean;
}

// Chat Types
export interface ChatMessage {
  id: string;
  roomId: string;
  sender: string;
  content: string;
  timestamp: Date;
}

export interface SendMessageRequest {
  roomId: string;
  sender: string;
  content: string;
}

// Signaling Types
export interface RTCSignalRequest {
  roomId: string;
  participantId: string;
  signal: {
    type: "offer" | "answer" | "ice-candidate";
    data: any;
    targetParticipantId?: string;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: 'chat' | 'signal' | 'participant-update' | 'room-update' | 'participant-joined' | 'participant-left' | 'participant-control' | 'participant-kicked' | 'join-room' | 'leave-room';
  data: any;
  roomId?: string;
  participantId?: string;
}

// Error Types
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Timeout Types
export interface CheckTimeoutResponse {
  shouldClose: boolean;
  remainingMinutes: number;
}
