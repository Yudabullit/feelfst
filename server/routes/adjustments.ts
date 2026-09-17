import { Router } from 'express';
import { dbInstance } from '../db';
import { InventoryService } from '../inventory';
import { StockAdjustment, SizeKey, SIZES } from '../../src/types';

export const adjustmentsRouter = Router();

// GET all stock adjustments
adjustmentsRouter.get('/', (req, res) => {
  const db = dbInstance.getRawData();
  const productLookup = new Map(db.products.map((p) => [p.id, p]));

  const records = db.stock_adjustments.map((adj) => ({
    ...adj,
    product: productLookup.get(adj.product_id),
  }));

  records.sort((a, b) => b.date.localeCompare(a.date));

  return res.json(records);
});

// POST new stock adjustment
adjustmentsRouter.post('/', (req, res) => {
  const { date, product_id, size, reason, created_by } = req.body;
  const rawQty = req.body.adjustment_qty !== undefined ? req.body.adjustment_qty : req.body.quantity_change;

  if (!date || !product_id || !size || rawQty === undefined || rawQty === null || !reason) {
    return res.status(400).json({
      error: 'Date, Product, Size, Adjustment Quantity (+/-), and Reason are required',
    });
  }

  if (!SIZES.includes(size as SizeKey)) {
    return res.status(400).json({ error: `Invalid size: ${size}` });
  }

  const parsedQty = Number(rawQty);
  if (isNaN(parsedQty) || parsedQty === 0) {
    return res.status(400).json({ error: 'Adjustment quantity must be non-zero (positive to increase, negative to decrease)' });
  }

  const db = dbInstance.getRawData();
  const prod = db.products.find((p) => p.id === product_id);
  if (!prod) {
    return res.status(400).json({ error: 'Product not found in Master Data' });
  }

  // If negative adjustment (reducing stock), ensure stock doesn't become negative
  if (parsedQty < 0) {
    const stockMap = InventoryService.calculateStock(product_id);
    const curStock = stockMap.get(product_id)?.breakdown[size as SizeKey] || 0;
    if (curStock + parsedQty < 0) {
      return res.status(400).json({
        error: `Cannot reduce stock below 0. Current available stock for size ${size} is ${curStock} pcs, but tried to reduce by ${Math.abs(parsedQty)} pcs.`,
      });
    }
  }

  const newAdj: StockAdjustment = {
    id: `adj-${Date.now()}`,
    date: String(date).trim(),
    product_id,
    size: size as SizeKey,
    adjustment_qty: parsedQty,
    reason: String(reason).trim(),
    created_by: created_by || 'Admin',
    created_at: new Date().toISOString(),
  };

  db.stock_adjustments.push(newAdj);
  dbInstance.save();

  return res.status(201).json({
    ...newAdj,
    product: prod,
  });
});

// DELETE stock adjustment by ID
adjustmentsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = dbInstance.getRawData();

  const index = db.stock_adjustments.findIndex((a) => a.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Stock adjustment record not found' });
  }

  const targetAdj = db.stock_adjustments[index];

  // If reverting an increase (positive adjustment), check if subtracting it leaves remaining stock >= 0
  if (targetAdj.adjustment_qty > 0) {
    const stockMap = InventoryService.calculateStock(targetAdj.product_id);
    const curStock = stockMap.get(targetAdj.product_id)?.breakdown[targetAdj.size] || 0;
    if (curStock - targetAdj.adjustment_qty < 0) {
      return res.status(400).json({
        error: `Cannot delete adjustment: reverting this +${targetAdj.adjustment_qty} pcs would result in negative current stock (${curStock - targetAdj.adjustment_qty} pcs).`,
      });
    }
  }

  db.stock_adjustments.splice(index, 1);
  dbInstance.save();

  return res.json({ success: true, message: 'Stock adjustment record deleted successfully' });
});
