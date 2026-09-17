import { Router } from 'express';
import { dbInstance } from '../db';
import { InventoryService } from '../inventory';
import { StockOut, StockOutItem, StockOutReason, SizeKey } from '../../src/types';

export const stockOutRouter = Router();

// GET all stock out records
stockOutRouter.get('/', (req, res) => {
  const db = dbInstance.getRawData();
  const productLookup = new Map(db.products.map((p) => [p.id, p]));

  const records = db.stock_out.map((so) => {
    const enrichedItems = (so.items || []).map((item) => ({
      ...item,
      product: productLookup.get(item.product_id),
    }));
    return {
      ...so,
      items: enrichedItems,
    };
  });

  records.sort((a, b) => b.date.localeCompare(a.date));

  return res.json(records);
});

// POST new stock out transaction
stockOutRouter.post('/', (req, res) => {
  const { date, reason, recipient_or_purpose, notes, created_by, items } = req.body as {
    date: string;
    reason: StockOutReason;
    recipient_or_purpose: string;
    notes?: string;
    created_by?: string;
    items: {
      product_id: string;
      size: SizeKey;
      quantity: number;
    }[];
  };

  if (!date || !reason || !recipient_or_purpose || !items || !items.length) {
    return res.status(400).json({
      error: 'Date, Reason, Recipient/Purpose, and at least one item are required',
    });
  }

  const db = dbInstance.getRawData();
  const productLookup = new Map(db.products.map((p) => [p.id, p]));

  // Validate stock availability for each item
  for (const item of items) {
    const prod = productLookup.get(item.product_id);
    if (!prod) {
      return res.status(400).json({ error: 'Product not found in Master Data' });
    }

    const validation = InventoryService.validateStock(item.product_id, item.size, item.quantity);
    if (!validation.isValid) {
      return res.status(400).json({
        error: `Insufficient stock for "${prod.design} (${prod.colour})" Size ${item.size}. Available: ${validation.available}. Requested: ${item.quantity}.`,
      });
    }
  }

  const stockOutId = `stkout-${Date.now()}`;
  const now = new Date().toISOString();
  const createdItems: StockOutItem[] = [];
  let totalQty = 0;

  for (const item of items) {
    const prod = productLookup.get(item.product_id)!;
    const soItem: StockOutItem = {
      id: `stkoitem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      stock_out_id: stockOutId,
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
      cost_price: prod.cost_price,
    };
    createdItems.push(soItem);
    totalQty += item.quantity;
  }

  const referenceNo = `SO-${date.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

  const stockOutRecord: StockOut = {
    id: stockOutId,
    reference_no: referenceNo,
    date: date.trim(),
    reason,
    recipient_or_purpose: recipient_or_purpose.trim(),
    notes: notes?.trim() || '',
    total_qty: totalQty,
    created_by: created_by || 'Staff',
    created_at: now,
    items: createdItems,
  };

  db.stock_out.push(stockOutRecord);
  db.stock_out_items.push(...createdItems);
  dbInstance.save();

  return res.status(201).json(stockOutRecord);
});

// DELETE stock out record (admin only)
stockOutRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = dbInstance.getRawData();

  const idx = db.stock_out.findIndex((so) => so.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Stock Out record not found' });
  }

  db.stock_out.splice(idx, 1);
  db.stock_out_items = db.stock_out_items.filter((it) => it.stock_out_id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Stock Out record deleted and stock restored.' });
});
