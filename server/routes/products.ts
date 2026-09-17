import { Router } from 'express';
import { dbInstance } from '../db';
import { InventoryService } from '../inventory';
import { Product } from '../../src/types';

export const productsRouter = Router();

// GET all products with calculated stock
productsRouter.get('/', (req, res) => {
  const { search, type, status } = req.query as {
    search?: string;
    type?: string;
    status?: string;
  };

  let list = InventoryService.getProductsWithStock();

  if (search) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.design.toLowerCase().includes(q) ||
        p.colour.toLowerCase().includes(q) ||
        p.type.toLowerCase().includes(q)
    );
  }

  if (type && type !== 'ALL') {
    list = list.filter((p) => p.type.toLowerCase() === type.toLowerCase());
  }

  if (status && status !== 'ALL') {
    list = list.filter((p) => p.status === status);
  }

  return res.json(list);
});

// GET single product by ID with stock and movement history
productsRouter.get('/:id', (req, res) => {
  const { id } = req.params;
  const product = InventoryService.getProductById(id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const history = InventoryService.getProductMovementHistory(id);

  return res.json({
    product,
    history,
  });
});

// POST add new product
productsRouter.post('/', (req, res) => {
  const { design, colour, code, type, cost_price, retail_price } = req.body;

  if (!design || !colour || !code || !type) {
    return res.status(400).json({ error: 'Design, Colour, Code, and Type are required' });
  }

  const trimmedCode = code.trim().toUpperCase();
  const db = dbInstance.getRawData();

  // Rule 1: Product Code must be unique
  const exists = db.products.some((p) => p.code.toUpperCase() === trimmedCode);
  if (exists) {
    return res.status(400).json({ error: `Product code "${trimmedCode}" is already in use.` });
  }

  const parsedCost = Number(cost_price);
  const parsedRetail = Number(retail_price);

  if (isNaN(parsedCost) || parsedCost < 0 || isNaN(parsedRetail) || parsedRetail < 0) {
    return res.status(400).json({ error: 'Cost price and Retail price must be positive numbers' });
  }

  const now = new Date().toISOString();
  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    design: design.trim().toUpperCase(),
    colour: colour.trim().toUpperCase(),
    code: trimmedCode,
    type: type.trim(),
    cost_price: parsedCost,
    retail_price: parsedRetail,
    created_at: now,
    updated_at: now,
  };

  db.products.push(newProduct);
  dbInstance.save();

  const productWithStock = InventoryService.getProductById(newProduct.id);
  return res.status(201).json(productWithStock);
});

// PUT update product
productsRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { design, colour, code, type, cost_price, retail_price } = req.body;

  const db = dbInstance.getRawData();
  const product = db.products.find((p) => p.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const trimmedCode = code?.trim().toUpperCase();
  if (trimmedCode && trimmedCode !== product.code) {
    const exists = db.products.some((p) => p.id !== id && p.code.toUpperCase() === trimmedCode);
    if (exists) {
      return res.status(400).json({ error: `Product code "${trimmedCode}" is already in use.` });
    }
    product.code = trimmedCode;
  }

  if (design) product.design = design.trim().toUpperCase();
  if (colour) product.colour = colour.trim().toUpperCase();
  if (type) product.type = type.trim();

  if (cost_price !== undefined) {
    const cp = Number(cost_price);
    if (isNaN(cp) || cp < 0) return res.status(400).json({ error: 'Invalid cost price' });
    product.cost_price = cp;
  }

  if (retail_price !== undefined) {
    const rp = Number(retail_price);
    if (isNaN(rp) || rp < 0) return res.status(400).json({ error: 'Invalid retail price' });
    product.retail_price = rp;
  }

  product.updated_at = new Date().toISOString();
  dbInstance.save();

  const updated = InventoryService.getProductById(id);
  return res.json(updated);
});

// DELETE product
productsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const db = dbInstance.getRawData();
  const idx = db.products.findIndex((p) => p.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'Product not found in Master Data' });
  }

  const targetProduct = db.products[idx];

  // Check and clean up all linked transaction records across collections
  const stockInItems = db.stock_in_items.filter((it) => it.product_id === id);
  const saleItems = db.sale_items.filter((it) => it.product_id === id);
  const stockOutItems = db.stock_out_items.filter((it) => it.product_id === id);
  const adjustments = db.stock_adjustments.filter((it) => it.product_id === id);

  // 1. Remove linked stock adjustments
  if (adjustments.length > 0) {
    db.stock_adjustments = db.stock_adjustments.filter((a) => a.product_id !== id);
  }

  // 2. Clean up stock in items and update or remove parent stock in vouchers
  if (stockInItems.length > 0) {
    const affectedStockInIds = new Set(stockInItems.map((it) => it.stock_in_id));
    db.stock_in_items = db.stock_in_items.filter((it) => it.product_id !== id);

    for (const stkId of affectedStockInIds) {
      const remainingItems = db.stock_in_items.filter((it) => it.stock_in_id === stkId);
      const parentIndex = db.stock_in.findIndex((s) => s.id === stkId);
      if (parentIndex !== -1) {
        if (remainingItems.length === 0) {
          db.stock_in.splice(parentIndex, 1);
        } else {
          db.stock_in[parentIndex].total_qty = remainingItems.reduce((sum, it) => sum + it.quantity, 0);
          db.stock_in[parentIndex].total_cost = remainingItems.reduce(
            (sum, it) => sum + it.quantity * it.cost_price,
            0
          );
        }
      }
    }
  }

  // 3. Clean up sale items and update or remove parent sales transactions
  if (saleItems.length > 0) {
    const affectedSaleIds = new Set(saleItems.map((it) => it.sale_id));
    db.sale_items = db.sale_items.filter((it) => it.product_id !== id);

    for (const saleId of affectedSaleIds) {
      const remainingItems = db.sale_items.filter((it) => it.sale_id === saleId);
      const parentIndex = db.sales.findIndex((s) => s.id === saleId);
      if (parentIndex !== -1) {
        if (remainingItems.length === 0) {
          db.sales.splice(parentIndex, 1);
        } else {
          const subtotal = remainingItems.reduce((sum, it) => sum + it.subtotal, 0);
          const totalQty = remainingItems.reduce((sum, it) => sum + it.quantity, 0);
          db.sales[parentIndex].subtotal = subtotal;
          db.sales[parentIndex].total_qty = totalQty;
          const adminFee = db.sales[parentIndex].admin_fee || 0;
          db.sales[parentIndex].total_amount = subtotal + adminFee;
        }
      }
    }
  }

  // 4. Clean up stock out items and update or remove parent stock out records
  if (stockOutItems.length > 0) {
    const affectedStockOutIds = new Set(stockOutItems.map((it) => it.stock_out_id));
    db.stock_out_items = db.stock_out_items.filter((it) => it.product_id !== id);

    for (const stoId of affectedStockOutIds) {
      const remainingItems = db.stock_out_items.filter((it) => it.stock_out_id === stoId);
      const parentIndex = db.stock_out.findIndex((s) => s.id === stoId);
      if (parentIndex !== -1) {
        if (remainingItems.length === 0) {
          db.stock_out.splice(parentIndex, 1);
        } else {
          db.stock_out[parentIndex].total_qty = remainingItems.reduce((sum, it) => sum + it.quantity, 0);
        }
      }
    }
  }

  // 5. Remove the product from master list
  db.products.splice(idx, 1);
  dbInstance.save();

  return res.json({
    success: true,
    message: `Product "${targetProduct.design} (${targetProduct.code})" and all associated stock records were removed successfully.`,
    removed_product: targetProduct,
  });
});
