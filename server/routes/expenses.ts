import { Router } from 'express';
import { dbInstance } from '../db';
import { Expense, ExpenseCategory } from '../../src/types';

export const expensesRouter = Router();

// GET all expenses
expensesRouter.get('/', (req, res) => {
  const { type, startDate, endDate, search } = req.query as {
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };

  const db = dbInstance.getRawData();
  let list = [...db.expenses];

  if (type && type !== 'ALL') {
    list = list.filter((e) => e.type === type);
  }

  if (startDate) {
    list = list.filter((e) => e.date >= startDate);
  }

  if (endDate) {
    list = list.filter((e) => e.date <= endDate);
  }

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        (e.vendor && e.vendor.toLowerCase().includes(q)) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => b.date.localeCompare(a.date));

  return res.json(list);
});

// POST new expense
expensesRouter.post('/', (req, res) => {
  const { date, description, type, qty, total_amount, vendor, notes, created_by } = req.body as {
    date: string;
    description: string;
    type: ExpenseCategory;
    qty?: number;
    total_amount: number;
    vendor?: string;
    notes?: string;
    created_by?: string;
  };

  if (!date || !description || !type || total_amount === undefined) {
    return res.status(400).json({ error: 'Date, Description, Type, and Total Amount are required' });
  }

  const parsedAmount = Number(total_amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return res.status(400).json({ error: 'Total amount must be a positive number' });
  }

  const parsedQty = Number(qty || 1);

  const db = dbInstance.getRawData();
  const newExpense: Expense = {
    id: `exp-${Date.now()}`,
    date: date.trim(),
    description: description.trim(),
    type,
    qty: parsedQty,
    total_amount: parsedAmount,
    vendor: vendor?.trim() || '-',
    notes: notes?.trim() || '',
    created_by: created_by || 'Staff',
    created_at: new Date().toISOString(),
  };

  db.expenses.push(newExpense);
  dbInstance.save();

  return res.status(201).json(newExpense);
});

// DELETE expense (admin only)
expensesRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = dbInstance.getRawData();

  const idx = db.expenses.findIndex((e) => e.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  db.expenses.splice(idx, 1);
  dbInstance.save();

  return res.json({ success: true, message: 'Expense deleted successfully' });
});
