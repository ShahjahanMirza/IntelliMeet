// Frontend Types
export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
  isHost: boolean;
}

export interface Room {
  id: string;
  title: string;
  description?: string;
  hasPassword: boolean;
  isRecordingEnabled: boolean;
  maxParticipants: number;
  createdAt: string;
  isActive: boolean;
  participantCount?: number;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: string;
  content: string;
  timestamp: string;
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
    joinedAt: string;
    isHost: boolean;
  };
}

export interface CheckTimeoutResponse {
  shouldClose: boolean;
  remainingMinutes: number;
}
