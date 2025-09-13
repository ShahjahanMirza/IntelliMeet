import { WebSocketServer, WebSocket } from 'ws';
import { WebSocketMessage } from '../types/index.js';

interface ConnectedClient {
  ws: WebSocket;
  roomId?: string;
  participantId?: string;
  lastPing: number;
  isAlive: boolean;
}

const connectedClients = new Map<string, ConnectedClient>();
const roomClientCount = new Map<string, number>();

// Connection limits and cleanup
const MAX_CLIENTS_PER_ROOM = 10;
const PING_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds

export function setupWebSocketServer(wss: WebSocketServer) {
  // Set up ping/pong heartbeat
  const pingInterval = setInterval(() => {
    cleanupDeadConnections();
    pingConnections();
  }, PING_INTERVAL);

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = generateClientId();

    console.log(`WebSocket client connected: ${clientId}`);

    const client: ConnectedClient = {
      ws,
      lastPing: Date.now(),
      isAlive: true
    };

    connectedClients.set(clientId, client);

    // Set up pong handler
    ws.on('pong', () => {
      const client = connectedClients.get(clientId);
      if (client) {
        client.isAlive = true;
        client.lastPing = Date.now();
      }
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message: WebSocketMessage = JSON.parse(data.toString());

        // Rate limiting check
        if (!rateLimitCheck(clientId)) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Rate limit exceeded'
          }));
          return;
        }

        handleWebSocketMessage(clientId, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log(`WebSocket client disconnected: ${clientId}`);
      cleanupClient(clientId);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for client ${clientId}:`, error);
      cleanupClient(clientId);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      message: 'WebSocket connection established'
    }));
  });

  // Export cleanup function for graceful shutdown
  return {
    cleanup: () => {
      console.log('Cleaning up WebSocket connections...');
      clearInterval(pingInterval);
      wss.close();
    }
  };
}

function handleWebSocketMessage(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client) return;

  switch (message.type) {
    case 'join-room':
      handleJoinRoom(clientId, message);
      break;

    case 'leave-room':
      handleLeaveRoom(clientId, message);
      break;

    case 'chat':
      handleChatMessage(clientId, message);
      break;

    case 'signal':
      handleSignaling(clientId, message);
      break;

    case 'participant-update':
      handleParticipantUpdate(clientId, message);
      break;

    case 'participant-control':
      handleParticipantControl(clientId, message);
      break;

    case 'participant-kicked':
      handleParticipantKicked(clientId, message);
      break;

    default:
      console.warn(`Unknown message type: ${message.type}`);
  }
}

function handleJoinRoom(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client) return;

  const { roomId, participantId } = message.data;

  // Check room capacity
  const currentRoomCount = roomClientCount.get(roomId) || 0;
  if (currentRoomCount >= MAX_CLIENTS_PER_ROOM) {
    client.ws.send(JSON.stringify({
      type: 'error',
      message: 'Room is full'
    }));
    return;
  }

  // Remove from previous room if any
  if (client.roomId) {
    leaveRoomInternal(clientId, client.roomId);
  }

  client.roomId = roomId;
  client.participantId = participantId;

  // Update room count
  roomClientCount.set(roomId, currentRoomCount + 1);

  // Notify other participants in the room
  broadcastToRoom(roomId, {
    type: 'participant-joined',
    data: {
      participantId,
      roomId
    }
  }, clientId);

  console.log(`Client ${clientId} joined room ${roomId} as participant ${participantId} (${currentRoomCount + 1}/${MAX_CLIENTS_PER_ROOM})`);
}

function handleLeaveRoom(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || !client.roomId) return;

  leaveRoomInternal(clientId, client.roomId);
}

function leaveRoomInternal(clientId: string, roomId: string) {
  const client = connectedClients.get(clientId);
  if (!client) return;

  const participantId = client.participantId;

  // Notify other participants in the room
  broadcastToRoom(roomId, {
    type: 'participant-left',
    data: {
      participantId,
      roomId
    }
  }, clientId);

  // Update room count
  const currentRoomCount = roomClientCount.get(roomId) || 0;
  if (currentRoomCount > 0) {
    roomClientCount.set(roomId, currentRoomCount - 1);
  }

  client.roomId = undefined;
  client.participantId = undefined;

  console.log(`Client ${clientId} left room ${roomId} (${Math.max(0, currentRoomCount - 1)}/${MAX_CLIENTS_PER_ROOM})`);
}

function handleChatMessage(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || !client.roomId) return;

  // Broadcast chat message to all participants in the room
  broadcastToRoom(client.roomId, {
    type: 'chat',
    data: message.data
  });
}

function handleSignaling(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || !client.roomId) return;

  const { targetParticipantId, signal } = message.data;

  if (targetParticipantId) {
    // Send to specific participant
    sendToParticipant(targetParticipantId, {
      type: 'signal',
      data: {
        ...signal,
        fromParticipantId: client.participantId
      }
    });
  } else {
    // Broadcast to all participants in the room (except sender)
    broadcastToRoom(client.roomId, {
      type: 'signal',
      data: {
        ...signal,
        fromParticipantId: client.participantId
      }
    }, clientId);
  }
}

function handleParticipantUpdate(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || !client.roomId) return;

  // Broadcast participant update to all participants in the room
  broadcastToRoom(client.roomId, {
    type: 'participant-update',
    data: {
      ...message.data,
      participantId: client.participantId
    }
  }, clientId);
}

function handleParticipantControl(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || !client.roomId) return;

  // Broadcast participant control message to all participants in the room
  broadcastToRoom(client.roomId, {
    type: 'participant-control',
    data: {
      ...message.data,
      fromParticipantId: client.participantId
    }
  });
}

function handleParticipantKicked(clientId: string, message: WebSocketMessage) {
  const client = connectedClients.get(clientId);
  if (!client || !client.roomId) return;

  const { participantId } = message.data;

  // Send kick message to specific participant
  sendToParticipant(participantId, {
    type: 'participant-kicked',
    data: {
      message: 'You have been removed from the meeting by the host'
    }
  });

  // Notify other participants
  broadcastToRoom(client.roomId, {
    type: 'participant-left',
    data: {
      participantId,
      roomId: client.roomId,
      reason: 'kicked'
    }
  }, clientId);
}

function broadcastToRoom(roomId: string, message: WebSocketMessage, excludeClientId?: string) {
  const messageStr = JSON.stringify(message);
  let sentCount = 0;

  for (const [clientId, client] of connectedClients.entries()) {
    if (client.roomId === roomId &&
        clientId !== excludeClientId &&
        client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`Failed to send message to client ${clientId}:`, error);
        cleanupClient(clientId);
      }
    }
  }

  console.log(`Broadcasted message to ${sentCount} clients in room ${roomId}`);
}

function sendToParticipant(participantId: string, message: WebSocketMessage) {
  for (const [clientId, client] of connectedClients.entries()) {
    if (client.participantId === participantId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
      return;
    }
  }
  console.warn(`Participant ${participantId} not found for message delivery`);
}

function generateClientId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Rate limiting
const clientMessageCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_MESSAGES = 100;

function rateLimitCheck(clientId: string): boolean {
  const now = Date.now();
  const clientData = clientMessageCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    clientMessageCounts.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return true;
  }

  if (clientData.count >= RATE_LIMIT_MAX_MESSAGES) {
    return false;
  }

  clientData.count++;
  return true;
}

// Connection management
function cleanupClient(clientId: string) {
  const client = connectedClients.get(clientId);
  if (client?.roomId) {
    leaveRoomInternal(clientId, client.roomId);
  }

  connectedClients.delete(clientId);
  clientMessageCounts.delete(clientId);
}

function cleanupDeadConnections() {
  const now = Date.now();
  const deadClients: string[] = [];

  for (const [clientId, client] of connectedClients.entries()) {
    if (!client.isAlive || (now - client.lastPing) > CLIENT_TIMEOUT) {
      deadClients.push(clientId);
    }
  }

  deadClients.forEach(clientId => {
    console.log(`Cleaning up dead connection: ${clientId}`);
    cleanupClient(clientId);
  });
}

function pingConnections() {
  for (const [clientId, client] of connectedClients.entries()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.isAlive = false;
      try {
        client.ws.ping();
      } catch (error) {
        console.error(`Failed to ping client ${clientId}:`, error);
        cleanupClient(clientId);
      }
    } else {
      cleanupClient(clientId);
    }
  }
}
