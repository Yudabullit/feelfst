import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { ChatMessage, ChatPresenceUser } from '../src/types';
import { dbInstance } from './db';

interface ConnectedClient {
  ws: WebSocket;
  user?: ChatPresenceUser;
  isAlive: boolean;
}

const connectedClients = new Set<ConnectedClient>();
let wssInstance: WebSocketServer | null = null;

export function initChatWebSocketServer(server: http.Server) {
  wssInstance = new WebSocketServer({ server, path: '/ws/chat' });

  wssInstance.on('connection', (ws: WebSocket) => {
    const client: ConnectedClient = { ws, isAlive: true };
    connectedClients.add(client);

    // Heartbeat ping
    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (data: string) => {
      try {
        const payload = JSON.parse(data.toString());

        if (payload.type === 'join' && payload.user) {
          client.user = {
            id: payload.user.id,
            username: payload.user.username,
            name: payload.user.name,
            role: payload.user.role,
            online_at: new Date().toISOString(),
          };
          broadcastPresence();
        } else if (payload.type === 'message' && payload.message && client.user) {
          const text = String(payload.message).trim();
          if (text) {
            const db = dbInstance.getRawData();
            const newMsg: ChatMessage = {
              id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
              user_id: client.user.id,
              username: client.user.username,
              name: client.user.name,
              role: client.user.role,
              message: text,
              created_at: new Date().toISOString(),
              pinned: Boolean(payload.pinned),
            };

            if (!db.chat_messages) {
              db.chat_messages = [];
            }
            db.chat_messages.push(newMsg);
            dbInstance.save();

            broadcast({
              type: 'new_message',
              message: newMsg,
            });
          }
        } else if (payload.type === 'typing' && client.user) {
          broadcastToOthers(ws, {
            type: 'user_typing',
            user: client.user,
            isTyping: Boolean(payload.isTyping),
          });
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      connectedClients.delete(client);
      broadcastPresence();
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err);
      connectedClients.delete(client);
      broadcastPresence();
    });

    // Send initial presence & welcome
    broadcastPresence();
  });

  // Keep-alive heartbeat interval every 30 seconds
  const interval = setInterval(() => {
    for (const client of connectedClients) {
      if (!client.isAlive) {
        client.ws.terminate();
        connectedClients.delete(client);
        continue;
      }
      client.isAlive = false;
      client.ws.ping();
    }
  }, 30000);

  wssInstance.on('close', () => {
    clearInterval(interval);
  });

  return wssInstance;
}

function broadcast(data: any) {
  const messageStr = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}

function broadcastToOthers(senderWs: WebSocket, data: any) {
  const messageStr = JSON.stringify(data);
  for (const client of connectedClients) {
    if (client.ws !== senderWs && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageStr);
    }
  }
}

export function broadcastPresence() {
  const activeUsers: ChatPresenceUser[] = [];
  const seenIds = new Set<string>();

  for (const client of connectedClients) {
    if (client.user && !seenIds.has(client.user.id)) {
      seenIds.add(client.user.id);
      activeUsers.push(client.user);
    }
  }

  broadcast({
    type: 'presence_update',
    online_count: activeUsers.length,
    users: activeUsers,
  });
}

export function broadcastChatMessage(message: ChatMessage) {
  broadcast({
    type: 'new_message',
    message,
  });
}

export function broadcastDeleteMessage(id: string) {
  broadcast({
    type: 'delete_message',
    id,
  });
}

export function broadcastPinMessage(id: string, pinned: boolean) {
  broadcast({
    type: 'pin_message',
    id,
    pinned,
  });
}

export function getOnlineUsers(): ChatPresenceUser[] {
  const activeUsers: ChatPresenceUser[] = [];
  const seenIds = new Set<string>();

  for (const client of connectedClients) {
    if (client.user && !seenIds.has(client.user.id)) {
      seenIds.add(client.user.id);
      activeUsers.push(client.user);
    }
  }
  return activeUsers;
}
