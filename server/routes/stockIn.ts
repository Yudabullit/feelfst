import { Router } from 'express';
import { dbInstance } from '../db';
import { StockIn, StockInItem, SizeKey, SIZES } from '../../src/types';

export const stockInRouter = Router();

// GET all stock in records
stockInRouter.get('/', (req, res) => {
  try {
    const db = dbInstance.getRawData();
    const productLookup = new Map(db.products.map((p) => [p.id, p]));

    const records = db.stock_in.map((si) => {
      const enrichedItems = (si.items || []).map((item) => ({
        ...item,
        product: productLookup.get(item.product_id),
      }));
      return {
        ...si,
        items: enrichedItems,
      };
    });

    // Sort descending by date
    records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    return res.json(records);
  } catch (err: any) {
    console.error('Error fetching stock in records:', err);
    return res.status(500).json({ error: err.message || 'Failed to retrieve stock in records' });
  }
});

// POST new stock in transaction
stockInRouter.post('/', (req, res) => {
  try {
    const { date, vendor, tax, notes, created_by, items } = req.body as {
      date: string;
      vendor: string;
      tax?: number;
      notes?: string;
      created_by?: string;
      items: any[];
    };

    if (!date || !vendor || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Date, Vendor, and at least one item are required' });
    }

    const db = dbInstance.getRawData();
    const productLookup = new Map(db.products.map((p) => [p.id, p]));

    const stockInId = `stkin-${Date.now()}`;
    const now = new Date().toISOString();
    const createdItems: StockInItem[] = [];

    let totalQty = 0;
    let itemsCostTotal = 0;

    for (const rawItem of items) {
      if (!rawItem || !rawItem.product_id) continue;

      const prod = productLookup.get(rawItem.product_id);
      if (!prod) {
        return res.status(400).json({
          error: `Product ID "${rawItem.product_id}" not found in Master Data. Please refresh and select a valid product.`,
        });
      }

      const costPrice = Number(rawItem.cost_price ?? prod.cost_price);
      if (isNaN(costPrice) || costPrice < 0) {
        return res.status(400).json({ error: 'Cost price must be a valid non-negative number' });
      }

      // Format 1: Direct flat item { product_id, size, quantity, cost_price }
      if (rawItem.size && rawItem.quantity !== undefined) {
        const q = Number(rawItem.quantity);
        if (q > 0) {
          if (!SIZES.includes(rawItem.size)) {
            return res.status(400).json({ error: `Invalid size "${rawItem.size}" for product ${prod.design}` });
          }
          const itemObj: StockInItem = {
            id: `stkitem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            stock_in_id: stockInId,
            product_id: rawItem.product_id,
            size: rawItem.size,
            quantity: q,
            cost_price: costPrice,
          };
          createdItems.push(itemObj);
          totalQty += q;
          itemsCostTotal += q * costPrice;
        }
      }

      // Format 2: Grouped item { product_id, sizes: [{ size, quantity }] }
      if (Array.isArray(rawItem.sizes)) {
        for (const s of rawItem.sizes) {
          const q = Number(s?.quantity);
          if (q > 0) {
            if (!SIZES.includes(s.size)) {
              return res.status(400).json({ error: `Invalid size "${s.size}" for product ${prod.design}` });
            }
            const itemObj: StockInItem = {
              id: `stkitem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              stock_in_id: stockInId,
              product_id: rawItem.product_id,
              size: s.size,
              quantity: q,
              cost_price: costPrice,
            };
            createdItems.push(itemObj);
            totalQty += q;
            itemsCostTotal += q * costPrice;
          }
        }
      }
    }

    if (createdItems.length === 0) {
      return res.status(400).json({ error: 'At least one size must have a quantity greater than 0' });
    }

    const parsedTax = Number(tax || 0);
    const totalCost = itemsCostTotal + parsedTax;

    const invoiceNo = `IN-${date.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`;

    const stockInRecord: StockIn = {
      id: stockInId,
      invoice_no: invoiceNo,
      date: date.trim(),
      vendor: vendor.trim(),
      tax: parsedTax,
      notes: notes?.trim() || '',
      total_qty: totalQty,
      total_cost: totalCost,
      created_by: created_by || 'Admin',
      created_at: now,
      items: createdItems,
    };

    db.stock_in.push(stockInRecord);
    db.stock_in_items.push(...createdItems);
    dbInstance.save();

    return res.status(201).json(stockInRecord);
  } catch (err: any) {
    console.error('Error creating stock in:', err);
    return res.status(500).json({ error: err.message || 'Internal server error processing stock in' });
  }
});

// DELETE stock in record (admin only)
stockInRouter.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const db = dbInstance.getRawData();

    const idx = db.stock_in.findIndex((si) => si.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Stock In record not found' });
    }

    db.stock_in.splice(idx, 1);
    db.stock_in_items = db.stock_in_items.filter((it) => it.stock_in_id !== id);
    dbInstance.save();

    return res.json({ success: true, message: 'Stock in record deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting stock in record:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete stock in record' });
  }
});
