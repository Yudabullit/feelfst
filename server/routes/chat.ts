import { Router } from 'express';
import { dbInstance } from '../db';
import { ChatMessage, UserRole } from '../../src/types';
import {
  broadcastChatMessage,
  broadcastDeleteMessage,
  broadcastPinMessage,
  getOnlineUsers,
} from '../chatService';

export const chatRouter = Router();

// GET all chat messages
chatRouter.get('/messages', (req, res) => {
  try {
    const db = dbInstance.getRawData();
    const messages = db.chat_messages || [];

    // Sort chronologically ascending for chat display
    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return res.json({
      messages: sorted,
      online_users: getOnlineUsers(),
    });
  } catch (err: any) {
    console.error('Error fetching chat messages:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch chat messages' });
  }
});

// GET online users
chatRouter.get('/online-users', (req, res) => {
  try {
    return res.json({ online_users: getOnlineUsers() });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to get online users' });
  }
});

// POST new message
chatRouter.post('/messages', (req, res) => {
  try {
    const { message, user_id, username, name, role, pinned } = req.body as {
      message: string;
      user_id?: string;
      username?: string;
      name?: string;
      role?: UserRole;
      pinned?: boolean;
    };

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const db = dbInstance.getRawData();
    if (!db.chat_messages) {
      db.chat_messages = [];
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: user_id || 'usr-guest',
      username: username || 'user',
      name: name || 'Team Member',
      role: role === 'admin' ? 'admin' : 'staff',
      message: message.trim(),
      created_at: new Date().toISOString(),
      pinned: Boolean(pinned),
    };

    db.chat_messages.push(newMessage);
    dbInstance.save();

    // Broadcast in real-time via WebSocket
    broadcastChatMessage(newMessage);

    return res.status(201).json(newMessage);
  } catch (err: any) {
    console.error('Error creating chat message:', err);
    return res.status(500).json({ error: err.message || 'Failed to post message' });
  }
});

// PUT toggle pin
chatRouter.put('/messages/:id/pin', (req, res) => {
  try {
    const { id } = req.params;
    const db = dbInstance.getRawData();

    if (!db.chat_messages) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const msg = db.chat_messages.find((m) => m.id === id);
    if (!msg) {
      return res.status(404).json({ error: 'Message not found' });
    }

    msg.pinned = !msg.pinned;
    dbInstance.save();

    broadcastPinMessage(id, msg.pinned);

    return res.json({ success: true, message: msg });
  } catch (err: any) {
    console.error('Error pinning chat message:', err);
    return res.status(500).json({ error: err.message || 'Failed to pin message' });
  }
});

// DELETE a message
chatRouter.delete('/messages/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = dbInstance.getRawData();

    if (!db.chat_messages) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const index = db.chat_messages.findIndex((m) => m.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Message not found' });
    }

    db.chat_messages.splice(index, 1);
    dbInstance.save();

    broadcastDeleteMessage(id);

    return res.json({ success: true, message: 'Message deleted' });
  } catch (err: any) {
    console.error('Error deleting chat message:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete message' });
  }
});
