import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { dbInstance } from '../db';
import { User, UserSession } from '../../src/types';

export const authRouter = Router();

// In-memory active tokens/sessions
const sessions = new Map<string, UserSession>();

authRouter.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const db = dbInstance.getRawData();
  const user = db.users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = `tok_${user.id}_${Date.now()}`;
  const session: UserSession = {
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  };

  sessions.set(token, session);

  return res.json({
    token,
    user: session,
  });
});

authRouter.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const session = sessions.get(token);

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  return res.json({ user: session });
});

authRouter.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    sessions.delete(token);
  }
  return res.json({ success: true });
});

authRouter.get('/users', (req, res) => {
  const db = dbInstance.getRawData();
  const safeUsers = db.users.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    created_at: u.created_at,
  }));
  return res.json(safeUsers);
});

authRouter.post('/users', (req, res) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const db = dbInstance.getRawData();
  const exists = db.users.some((u) => u.username.toLowerCase() === username.trim().toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  const newUser: User = {
    id: `usr-${Date.now()}`,
    username: username.trim(),
    password_hash: bcrypt.hashSync(password, 10),
    name: name.trim(),
    role: role === 'admin' ? 'admin' : 'staff',
    created_at: new Date().toISOString(),
  };

  db.users.push(newUser);
  dbInstance.save();

  return res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    name: newUser.name,
    role: newUser.role,
    created_at: newUser.created_at,
  });
});

authRouter.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  const db = dbInstance.getRawData();
  const idx = db.users.findIndex((u) => u.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (db.users[idx].username === 'admin') {
    return res.status(400).json({ error: 'Cannot delete primary admin user' });
  }

  db.users.splice(idx, 1);
  dbInstance.save();

  return res.json({ success: true });
});
