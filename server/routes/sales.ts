import { Router } from 'express';
import { dbInstance } from '../db';
import { InventoryService } from '../inventory';
import { Sale, SaleItem, SizeKey } from '../../src/types';

export const salesRouter = Router();

// GET all sales
salesRouter.get('/', (req, res) => {
  const db = dbInstance.getRawData();
  const productLookup = new Map(db.products.map((p) => [p.id, p]));

  const records = db.sales.map((sale) => {
    const enrichedItems = (sale.items || []).map((item) => ({
      ...item,
      product: productLookup.get(item.product_id),
    }));
    return {
      ...sale,
      items: enrichedItems,
    };
  });

  records.sort((a, b) => b.date.localeCompare(a.date));

  return res.json(records);
});

// POST new sale (POS checkout)
salesRouter.post('/', (req, res) => {
  const {
    date,
    customer_name,
    payment_method,
    payment_channel,
    admin_fee,
    notes,
    created_by,
    items,
  } = req.body as {
    date: string;
    customer_name?: string;
    payment_method: 'Cash' | 'Transfer' | 'E-Commerce';
    payment_channel: string;
    admin_fee?: number;
    notes?: string;
    created_by?: string;
    items: {
      product_id: string;
      size: SizeKey;
      quantity: number;
      retail_price?: number;
    }[];
  };

  if (!date || !payment_method || !payment_channel || !items || !items.length) {
    return res.status(400).json({
      error: 'Date, Payment Method, Payment Channel, and at least one item are required.',
    });
  }

  const db = dbInstance.getRawData();
  const productLookup = new Map(db.products.map((p) => [p.id, p]));

  // 1. First Pass: Validate that all products exist and check stock availability for EVERY item in cart!
  // Aggregating requested quantities by product + size in case user added same item multiple times
  const requestedMap = new Map<string, number>();
  for (const item of items) {
    const key = `${item.product_id}_${item.size}`;
    const cur = requestedMap.get(key) || 0;
    requestedMap.set(key, cur + item.quantity);
  }

  for (const [key, totalRequested] of requestedMap.entries()) {
    const [productId, size] = key.split('_') as [string, SizeKey];
    const prod = productLookup.get(productId);
    if (!prod) {
      return res.status(400).json({ error: `Product not found in Master Data.` });
    }

    const validation = InventoryService.validateStock(productId, size, totalRequested);
    if (!validation.isValid) {
      return res.status(400).json({
        error: `Insufficient stock for "${prod.design} (${prod.colour})" Size ${size}. Available quantity: ${validation.available}. Requested: ${totalRequested}.`,
      });
    }
  }

  // 2. Create Sale Record
  const saleId = `sale-${Date.now()}`;
  const now = new Date().toISOString();
  const createdItems: SaleItem[] = [];

  let subtotal = 0;
  let totalQty = 0;

  for (const item of items) {
    const prod = productLookup.get(item.product_id)!;
    // Historical price: capture at transaction time!
    const unitPrice = Number(item.retail_price !== undefined ? item.retail_price : prod.retail_price);
    const itemSubtotal = unitPrice * item.quantity;

    const saleItemObj: SaleItem = {
      id: `sitem-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sale_id: saleId,
      product_id: item.product_id,
      size: item.size,
      quantity: item.quantity,
      retail_price: unitPrice,
      subtotal: itemSubtotal,
    };

    createdItems.push(saleItemObj);
    subtotal += itemSubtotal;
    totalQty += item.quantity;
  }

  const parsedAdminFee = Number(admin_fee || 0);
  const totalAmount = subtotal + parsedAdminFee;

  const invoiceNo = `INV-${date.replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;

  const saleRecord: Sale = {
    id: saleId,
    invoice_no: invoiceNo,
    date: date.trim(),
    customer_name: customer_name?.trim() || 'General Customer',
    payment_method,
    payment_channel: payment_channel.trim(),
    admin_fee: parsedAdminFee,
    subtotal,
    total_amount: totalAmount,
    total_qty: totalQty,
    notes: notes?.trim() || '',
    created_by: created_by || 'Staff',
    created_at: now,
    items: createdItems,
  };

  db.sales.push(saleRecord);
  db.sale_items.push(...createdItems);
  dbInstance.save();

  return res.status(201).json(saleRecord);
});

// DELETE sale record (admin only)
salesRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = dbInstance.getRawData();

  const idx = db.sales.findIndex((s) => s.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Sale record not found' });
  }

  db.sales.splice(idx, 1);
  db.sale_items = db.sale_items.filter((it) => it.sale_id !== id);
  dbInstance.save();

  return res.json({ success: true, message: 'Sale deleted and stock restored.' });
});
