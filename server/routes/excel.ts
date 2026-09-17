import { Router } from 'express';
import * as XLSX from 'xlsx';
import { dbInstance } from '../db';
import { InventoryService } from '../inventory';
import { Product, SizeKey, SIZES, StockIn, StockInItem, Sale, SaleItem, StockOut, StockOutItem, Expense } from '../../src/types';

export const excelRouter = Router();

// POST preview import
excelRouter.post('/preview', (req, res) => {
  const { base64Data, sheetType } = req.body;
  if (!base64Data) {
    return res.status(400).json({ error: 'No Excel file data provided' });
  }

  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetNames = workbook.SheetNames;

    const previewResults: {
      sheetName: string;
      detectedType: string;
      totalRows: number;
      validRows: number;
      errorRows: number;
      errors: { row: number; field: string; message: string }[];
      dataPreview: any[];
    }[] = [];

    const db = dbInstance.getRawData();
    const existingCodes = new Set(db.products.map((p) => p.code.toUpperCase()));

    for (const name of sheetNames) {
      const sheet = workbook.Sheets[name];
      const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rawRows.length === 0) continue;

      let detected = 'unknown';
      const firstRow = rawRows[0];
      const keys = Object.keys(firstRow).map((k) => k.toLowerCase());

      if (keys.some((k) => k.includes('design') || k.includes('code') || k.includes('warna'))) {
        detected = 'Master Data';
      } else if (keys.some((k) => k.includes('retail') || k.includes('via') || k.includes('sales'))) {
        detected = 'Sales';
      } else if (keys.some((k) => k.includes('vendor') && (k.includes('stock in') || k.includes('pajak')))) {
        detected = 'Stock In';
      } else if (keys.some((k) => k.includes('endorse') || k.includes('stock out') || k.includes('reason'))) {
        detected = 'Stock Out';
      } else if (keys.some((k) => k.includes('pengeluaran') || k.includes('expense') || k.includes('operasional'))) {
        detected = 'Pengeluaran';
      }

      const errors: { row: number; field: string; message: string }[] = [];
      let validCount = 0;

      rawRows.forEach((row, idx) => {
        const rowNum = idx + 2; // Excel row numbering
        let rowHasError = false;

        if (detected === 'Master Data' || sheetType === 'products') {
          const code = String(row['Code'] || row['code'] || '').trim().toUpperCase();
          const design = String(row['Design'] || row['design'] || '').trim();
          if (!code) {
            errors.push({ row: rowNum, field: 'Code', message: 'Product Code is empty' });
            rowHasError = true;
          } else if (existingCodes.has(code)) {
            errors.push({ row: rowNum, field: 'Code', message: `Duplicate Product Code: ${code} already exists` });
            rowHasError = true;
          }
          if (!design) {
            errors.push({ row: rowNum, field: 'Design', message: 'Design name is required' });
            rowHasError = true;
          }
        } else if (detected === 'Sales' || sheetType === 'sales') {
          const productRef = String(row['Product'] || row['Code'] || '').trim();
          const qty = Number(row['Quantity'] || row['Qty'] || 0);
          if (!productRef) {
            errors.push({ row: rowNum, field: 'Product', message: 'Product reference missing' });
            rowHasError = true;
          }
          if (qty <= 0) {
            errors.push({ row: rowNum, field: 'Quantity', message: 'Quantity must be greater than 0' });
            rowHasError = true;
          }
        }

        if (!rowHasError) {
          validCount++;
        }
      });

      previewResults.push({
        sheetName: name,
        detectedType: detected,
        totalRows: rawRows.length,
        validRows: validCount,
        errorRows: errors.length,
        errors,
        dataPreview: rawRows.slice(0, 10),
      });
    }

    return res.json({ success: true, sheets: previewResults });
  } catch (err: any) {
    console.error('Excel parse error:', err);
    return res.status(400).json({ error: 'Failed to parse Excel file: ' + (err.message || 'Invalid format') });
  }
});

// POST confirm import
excelRouter.post('/confirm-import', (req, res) => {
  const { sheetName, type, rows, created_by } = req.body as {
    sheetName: string;
    type: 'products' | 'stock_in' | 'sales' | 'stock_out' | 'expenses';
    rows: any[];
    created_by?: string;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: 'No rows to import' });
  }

  const db = dbInstance.getRawData();
  let importedCount = 0;

  if (type === 'products') {
    const existingCodes = new Set(db.products.map((p) => p.code.toUpperCase()));
    for (const r of rows) {
      const code = String(r['Code'] || r['code'] || '').trim().toUpperCase();
      const design = String(r['Design'] || r['design'] || '').trim().toUpperCase();
      const colour = String(r['Colour'] || r['Color'] || r['colour'] || 'DEFAULT').trim().toUpperCase();
      const pType = String(r['Type'] || r['type'] || 'T-Shirt').trim();
      const cost = Number(r['Cost Price'] || r['Cost'] || r['Harga Pokok'] || 0);
      const retail = Number(r['Retail Price'] || r['Retail'] || r['Harga Retail'] || 0);

      if (code && design && !existingCodes.has(code)) {
        const newP: Product = {
          id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          design,
          colour,
          code,
          type: pType,
          cost_price: cost,
          retail_price: retail,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        db.products.push(newP);
        existingCodes.add(code);
        importedCount++;
      }
    }
  } else if (type === 'expenses') {
    for (const r of rows) {
      const desc = String(r['Description'] || r['description'] || '').trim();
      const amount = Number(r['Total Amount'] || r['Harga Total'] || r['Amount'] || 0);
      if (desc && amount > 0) {
        const newExp: Expense = {
          id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          date: String(r['Date'] || r['date'] || new Date().toISOString().split('T')[0]).trim(),
          description: desc,
          type: (r['Type'] || 'Operasional') as any,
          qty: Number(r['Qty'] || 1),
          total_amount: amount,
          vendor: String(r['Vendor'] || '-'),
          notes: String(r['Notes'] || 'Imported from Excel'),
          created_by: created_by || 'Excel Import',
          created_at: new Date().toISOString(),
        };
        db.expenses.push(newExp);
        importedCount++;
      }
    }
  }

  dbInstance.save();
  return res.json({ success: true, importedCount });
});

// GET export Excel
excelRouter.get('/export', (req, res) => {
  const { reportType, format, startDate, endDate, productType, search } = req.query as {
    reportType?: string;
    format?: 'xlsx' | 'csv';
    startDate?: string;
    endDate?: string;
    productType?: string;
    search?: string;
  };

  const db = dbInstance.getRawData();
  const wb = XLSX.utils.book_new();

  let filename = `FEELFST_${reportType || 'Export'}_${new Date().toISOString().split('T')[0]}`;
  let exportData: any[] = [];

  if (reportType === 'master_data' || reportType === 'inventory') {
    let prods = InventoryService.getProductsWithStock(endDate);
    if (productType && productType !== 'ALL') {
      prods = prods.filter((p) => p.type === productType);
    }
    if (search) {
      const q = search.toLowerCase();
      prods = prods.filter((p) => p.code.toLowerCase().includes(q) || p.design.toLowerCase().includes(q));
    }

    exportData = prods.map((p) => ({
      Code: p.code,
      Design: p.design,
      Colour: p.colour,
      Type: p.type,
      'Stock S': p.stock.S,
      'Stock M': p.stock.M,
      'Stock L': p.stock.L,
      'Stock XL': p.stock.XL,
      'Stock XXL': p.stock.XXL,
      'Total Stock': p.total_stock,
      'Cost Price': p.cost_price,
      'Retail Price': p.retail_price,
      'Stock Value (Cost)': p.total_stock * p.cost_price,
      'Stock Value (Retail)': p.total_stock * p.retail_price,
      Status: p.status,
    }));
  } else if (reportType === 'sales') {
    const productLookup = new Map(db.products.map((p) => [p.id, p]));
    const salesList = db.sales.filter((s) => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    });

    salesList.forEach((s) => {
      s.items.forEach((item) => {
        const prod = productLookup.get(item.product_id);
        exportData.push({
          'Invoice No': s.invoice_no,
          Date: s.date,
          Customer: s.customer_name || 'General Customer',
          'Product Code': prod?.code || '-',
          Design: prod?.design || '-',
          Colour: prod?.colour || '-',
          Size: item.size,
          Quantity: item.quantity,
          'Unit Price': item.retail_price,
          Subtotal: item.subtotal,
          'Admin Fee': s.admin_fee,
          Payment: s.payment_method,
          Via: s.payment_channel,
          Notes: s.notes,
          Cashier: s.created_by,
        });
      });
    });
  } else if (reportType === 'stock_in') {
    const productLookup = new Map(db.products.map((p) => [p.id, p]));
    db.stock_in.forEach((si) => {
      si.items.forEach((it) => {
        const prod = productLookup.get(it.product_id);
        exportData.push({
          'Invoice No': si.invoice_no,
          Date: si.date,
          Vendor: si.vendor,
          'Product Code': prod?.code || '-',
          Design: prod?.design || '-',
          Colour: prod?.colour || '-',
          Size: it.size,
          Quantity: it.quantity,
          'Cost Price': it.cost_price,
          'Item Cost': it.quantity * it.cost_price,
          Tax: si.tax,
          Notes: si.notes,
        });
      });
    });
  } else if (reportType === 'stock_out') {
    const productLookup = new Map(db.products.map((p) => [p.id, p]));
    db.stock_out.forEach((so) => {
      so.items.forEach((it) => {
        const prod = productLookup.get(it.product_id);
        exportData.push({
          'Reference No': so.reference_no,
          Date: so.date,
          Reason: so.reason,
          'Recipient / Purpose': so.recipient_or_purpose,
          'Product Code': prod?.code || '-',
          Design: prod?.design || '-',
          Colour: prod?.colour || '-',
          Size: it.size,
          Quantity: it.quantity,
          Notes: so.notes,
        });
      });
    });
  } else if (reportType === 'expenses') {
    exportData = db.expenses.map((e) => ({
      Date: e.date,
      Description: e.description,
      Type: e.type,
      Quantity: e.qty,
      'Total Amount': e.total_amount,
      Vendor: e.vendor,
      Notes: e.notes,
      'Created By': e.created_by,
    }));
  } else if (reportType === 'profit_loss') {
    const metrics = InventoryService.getDashboardMetrics(startDate, endDate);
    exportData = [
      { Category: 'Total Revenue', Amount: metrics.total_revenue, Notes: 'Gross Sales + Admin Fees' },
      { Category: 'Cost of Goods Sold (COGS)', Amount: metrics.total_cogs, Notes: 'Total product inventory cost for sold items' },
      { Category: 'Gross Profit', Amount: metrics.gross_profit, Notes: 'Revenue - COGS' },
      { Category: 'Operating & Business Expenses', Amount: metrics.total_expenses, Notes: 'Expenses logged in Pengeluaran' },
      { Category: 'Net Profit', Amount: metrics.net_profit, Notes: 'Gross Profit - Expenses' },
    ];
  } else {
    exportData = InventoryService.getUnifiedTransactions({ startDate, endDate }).map((t) => ({
      Date: t.date,
      Type: t.type,
      Product: t.product_name,
      Code: t.product_code,
      Size: t.size,
      Quantity: t.quantity,
      Direction: t.direction,
      Amount: t.amount,
      Reference: t.reference,
      Notes: t.notes,
    }));
  }

  const ws = XLSX.utils.json_to_sheet(exportData.length ? exportData : [{ Message: 'No records found' }]);
  XLSX.utils.book_append_sheet(wb, ws, reportType || 'Data');

  if (format === 'csv') {
    const csvContent = XLSX.utils.sheet_to_csv(ws);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    return res.send(csvContent);
  }

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
  return res.send(excelBuffer);
});
