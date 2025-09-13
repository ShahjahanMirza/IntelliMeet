// API Client for Express Backend

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

export interface Participant {
  id: string;
  name: string;
  joinedAt: Date;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isScreenSharing: boolean;
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
  };
}

export interface UpdateParticipantRequest {
  participantId: string;
  isAudioEnabled?: boolean;
  isVideoEnabled?: boolean;
  isScreenSharing?: boolean;
}

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

export interface RTCSignalRequest {
  roomId: string;
  participantId: string;
  signal: {
    type: "offer" | "answer" | "ice-candidate";
    data: any;
    targetParticipantId?: string;
  };
}

export interface CheckTimeoutResponse {
  shouldClose: boolean;
  remainingMinutes: number;
}

export interface WebSocketMessage {
  type: 'chat' | 'signal' | 'participant-update' | 'room-update' | 'participant-joined' | 'participant-left' | 'participant-control' | 'participant-kicked' | 'join-room' | 'leave-room';
  data: any;
  roomId?: string;
  participantId?: string;
}

export class AppError extends Error {
  constructor(public message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'AppError';
  }
}

export class APIClient {
  private baseURL: string;
  private wsURL: string;
  private ws: WebSocket | null = null;
  private wsListeners: Map<string, Set<(message: WebSocketMessage) => void>> = new Map();

  constructor(baseURL?: string) {
    // Auto-detect environment
    if (baseURL) {
      this.baseURL = baseURL;
    } else if (typeof window !== 'undefined') {
      // Browser environment - use current origin for production
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      this.baseURL = isProduction ? window.location.origin : 'http://localhost:8001';
    } else {
      // Server environment fallback
      this.baseURL = 'http://localhost:8001';
    }

    this.wsURL = this.baseURL.replace('http', 'ws');
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = await response.text() || errorMessage;
      }
      throw new AppError(errorMessage, response.status);
    }

    // Handle empty responses
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    const data = await response.json();

    // Parse dates
    return this.parseDates(data);
  }

  private parseDates(obj: any): any {
    if (obj === null || obj === undefined) return obj;

    if (typeof obj === 'string') {
      // Try to parse as date
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (dateRegex.test(obj)) {
        const date = new Date(obj);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.parseDates(item));
    }

    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.parseDates(obj[key]);
      }
      return result;
    }

    return obj;
  }

  // Room API Methods
  async createRoom(request: CreateRoomRequest): Promise<Room> {
    return this.makeRequest<Room>('/rooms', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getRoom(id: string): Promise<Room> {
    return this.makeRequest<Room>(`/rooms/${id}`);
  }

  async joinRoom(request: JoinRoomRequest): Promise<JoinRoomResponse> {
    return this.makeRequest<JoinRoomResponse>('/rooms/join', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async leaveRoom(participantId: string): Promise<void> {
    await this.makeRequest<void>('/rooms/leave', {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  }

  async checkTimeout(roomId: string): Promise<CheckTimeoutResponse> {
    return this.makeRequest<CheckTimeoutResponse>(`/rooms/${roomId}/timeout`);
  }

  async endMeeting(roomId: string, participantId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/rooms/${roomId}/end`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    });
  }

  // Participant API Methods
  async getParticipants(roomId: string): Promise<{ participants: Participant[] }> {
    return this.makeRequest<{ participants: Participant[] }>(`/participants/room/${roomId}`);
  }

  async updateParticipant(participantId: string, updates: Omit<UpdateParticipantRequest, 'participantId'>): Promise<void> {
    await this.makeRequest<void>(`/participants/${participantId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Host-only: Kick a participant from the room
  async kickParticipant(participantId: string, hostId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/participants/${participantId}/kick`, {
      method: 'POST',
      body: JSON.stringify({ hostId }),
    });
  }

  // Host-only: Mute/unmute a participant
  async muteParticipant(participantId: string, hostId: string, mute: boolean): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/participants/${participantId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ hostId, mute }),
    });
  }

  // Host-only: Control participant video
  async controlParticipantVideo(participantId: string, hostId: string, enable: boolean): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/participants/${participantId}/video`, {
      method: 'POST',
      body: JSON.stringify({ hostId, enable }),
    });
  }

  // Host-only: Control participant screen sharing
  async controlParticipantScreenShare(participantId: string, hostId: string, enable: boolean): Promise<{ success: boolean; message: string }> {
    return this.makeRequest<{ success: boolean; message: string }>(`/participants/${participantId}/screenshare`, {
      method: 'POST',
      body: JSON.stringify({ hostId, enable }),
    });
  }

  // Chat API Methods
  async sendMessage(request: SendMessageRequest): Promise<{ message: ChatMessage }> {
    return this.makeRequest<{ message: ChatMessage }>('/chat/send', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getMessages(roomId: string): Promise<{ messages: ChatMessage[] }> {
    return this.makeRequest<{ messages: ChatMessage[] }>(`/chat/${roomId}/messages`);
  }

  async clearMessages(roomId: string): Promise<void> {
    await this.makeRequest<void>(`/chat/${roomId}/clear`, {
      method: 'DELETE',
    });
  }

  // Signaling API Methods
  async sendSignal(request: RTCSignalRequest): Promise<{ success: boolean }> {
    return this.makeRequest<{ success: boolean }>('/signaling/rtc', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // WebSocket Methods
  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      this.ws = new WebSocket(this.wsURL);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.ws = null;
        // Auto-reconnect after 3 seconds
        setTimeout(() => this.connectWebSocket(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };
    });
  }

  private handleWebSocketMessage(message: WebSocketMessage) {
    // Notify all listeners for this message type
    const listeners = this.wsListeners.get(message.type);
    if (listeners) {
      listeners.forEach(listener => listener(message));
    }

    // Also notify 'all' listeners
    const allListeners = this.wsListeners.get('all');
    if (allListeners) {
      allListeners.forEach(listener => listener(message));
    }
  }

  onWebSocketMessage(type: string | 'all', listener: (message: WebSocketMessage) => void): () => void {
    if (!this.wsListeners.has(type)) {
      this.wsListeners.set(type, new Set());
    }

    this.wsListeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.wsListeners.get(type);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.wsListeners.delete(type);
        }
      }
    };
  }

  sendWebSocketMessage(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected');
    }
  }

  joinRoomWebSocket(roomId: string, participantId: string) {
    this.sendWebSocketMessage({
      type: 'join-room',
      data: { roomId, participantId }
    });
  }

  leaveRoomWebSocket(roomId: string, participantId: string) {
    this.sendWebSocketMessage({
      type: 'leave-room',
      data: { roomId, participantId }
    });
  }

  sendChatWebSocket(message: ChatMessage) {
    this.sendWebSocketMessage({
      type: 'chat',
      data: message
    });
  }

  sendSignalWebSocket(roomId: string, participantId: string, signal: any, targetParticipantId?: string) {
    this.sendWebSocketMessage({
      type: 'signal',
      data: {
        signal,
        targetParticipantId
      },
      roomId,
      participantId
    });
  }

  sendParticipantUpdateWebSocket(roomId: string, participantId: string, updates: any) {
    this.sendWebSocketMessage({
      type: 'participant-update',
      data: updates,
      roomId,
      participantId
    });
  }

  sendParticipantControlWebSocket(roomId: string, participantId: string, controlData: any) {
    this.sendWebSocketMessage({
      type: 'participant-control',
      data: controlData,
      roomId,
      participantId
    });
  }

  sendParticipantKickedWebSocket(roomId: string, participantId: string) {
    this.sendWebSocketMessage({
      type: 'participant-kicked',
      data: { participantId },
      roomId,
      participantId
    });
  }

  disconnectWebSocket() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsListeners.clear();
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest<{ status: string; timestamp: string }>('/health');
  }
}

// Create a default client instance
const client = new APIClient();

export default client;
