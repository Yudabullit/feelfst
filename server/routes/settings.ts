import { Router } from 'express';
import { dbInstance } from '../db';

export const settingsRouter = Router();

settingsRouter.get('/', (req, res) => {
  const db = dbInstance.getRawData();
  return res.json({
    settings: db.settings,
    payment_channels: db.payment_channels,
    expense_categories: db.expense_categories,
  });
});

settingsRouter.put('/', (req, res) => {
  const { settings, payment_channels, expense_categories } = req.body;
  const db = dbInstance.getRawData();

  if (settings) {
    db.settings = { ...db.settings, ...settings };
  }
  if (Array.isArray(payment_channels)) {
    db.payment_channels = payment_channels.filter(Boolean).map((c: string) => c.trim());
  }
  if (Array.isArray(expense_categories)) {
    db.expense_categories = expense_categories.filter(Boolean).map((c: string) => c.trim());
  }

  dbInstance.save();
  return res.json({
    settings: db.settings,
    payment_channels: db.payment_channels,
    expense_categories: db.expense_categories,
  });
});

settingsRouter.post('/reset-seed', (req, res) => {
  const data = dbInstance.resetToSeed();
  return res.json({ success: true, message: 'Database reset to original Excel seed data.' });
});
