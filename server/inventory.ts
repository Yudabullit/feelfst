import { dbInstance } from './db';
import {
  ProductWithStock,
  StockSizeBreakdown,
  SizeKey,
  SIZES,
  UnifiedTransaction,
  StockMovementRecord,
  DashboardMetrics,
} from '../src/types';

export class InventoryService {
  /**
   * Calculates the exact stock for all products or a single product
   * Formula: CURRENT STOCK = STOCK IN - SALES - STOCK OUT + ADJUSTMENTS
   * calculated per product and size.
   */
  public static calculateStock(
    targetProductId?: string,
    asOfDate?: string
  ): Map<string, { breakdown: StockSizeBreakdown; total: number; stockInTotal: number; salesTotal: number; stockOutTotal: number; adjTotal: number }> {
    const db = dbInstance.getRawData();
    const result = new Map<
      string,
      {
        breakdown: StockSizeBreakdown;
        total: number;
        stockInTotal: number;
        salesTotal: number;
        stockOutTotal: number;
        adjTotal: number;
      }
    >();

    const products = targetProductId
      ? db.products.filter((p) => p.id === targetProductId)
      : db.products;

    for (const prod of products) {
      result.set(prod.id, {
        breakdown: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        total: 0,
        stockInTotal: 0,
        salesTotal: 0,
        stockOutTotal: 0,
        adjTotal: 0,
      });
    }

    // 1. Accumulate Stock In
    const stockInMap = new Map<string, string>(); // stock_in_id -> date
    for (const si of db.stock_in) {
      if (!asOfDate || si.date <= asOfDate) {
        stockInMap.set(si.id, si.date);
      }
    }

    for (const item of db.stock_in_items) {
      if (!stockInMap.has(item.stock_in_id)) continue;
      const data = result.get(item.product_id);
      if (data && item.size in data.breakdown) {
        data.breakdown[item.size] += item.quantity;
        data.stockInTotal += item.quantity;
      }
    }

    // 2. Subtract Sales
    const salesMap = new Map<string, string>(); // sale_id -> date
    for (const s of db.sales) {
      if (!asOfDate || s.date <= asOfDate) {
        salesMap.set(s.id, s.date);
      }
    }

    for (const item of db.sale_items) {
      if (!salesMap.has(item.sale_id)) continue;
      const data = result.get(item.product_id);
      if (data && item.size in data.breakdown) {
        data.breakdown[item.size] -= item.quantity;
        data.salesTotal += item.quantity;
      }
    }

    // 3. Subtract Stock Out
    const stockOutMap = new Map<string, string>(); // stock_out_id -> date
    for (const so of db.stock_out) {
      if (!asOfDate || so.date <= asOfDate) {
        stockOutMap.set(so.id, so.date);
      }
    }

    for (const item of db.stock_out_items) {
      if (!stockOutMap.has(item.stock_out_id)) continue;
      const data = result.get(item.product_id);
      if (data && item.size in data.breakdown) {
        data.breakdown[item.size] -= item.quantity;
        data.stockOutTotal += item.quantity;
      }
    }

    // 4. Add/Subtract Stock Adjustments
    for (const adj of db.stock_adjustments) {
      if (!asOfDate || adj.date <= asOfDate) {
        const data = result.get(adj.product_id);
        if (data && adj.size in data.breakdown) {
          data.breakdown[adj.size] += adj.adjustment_qty;
          data.adjTotal += adj.adjustment_qty;
        }
      }
    }

    // Compute totals
    for (const [, data] of result) {
      data.total =
        data.breakdown.S +
        data.breakdown.M +
        data.breakdown.L +
        data.breakdown.XL +
        data.breakdown.XXL;
    }

    return result;
  }

  /**
   * Returns all products with computed stock
   */
  public static getProductsWithStock(asOfDate?: string): ProductWithStock[] {
    const db = dbInstance.getRawData();
    const stockMap = this.calculateStock(undefined, asOfDate);
    const lowStockThreshold = db.settings.low_stock_threshold || 5;

    return db.products.map((p) => {
      const stockData = stockMap.get(p.id) || {
        breakdown: { S: 0, M: 0, L: 0, XL: 0, XXL: 0 },
        total: 0,
        stockInTotal: 0,
        salesTotal: 0,
        stockOutTotal: 0,
        adjTotal: 0,
      };

      let status: 'out_of_stock' | 'low_stock' | 'in_stock' = 'in_stock';
      if (stockData.total === 0) {
        status = 'out_of_stock';
      } else if (stockData.total <= lowStockThreshold) {
        status = 'low_stock';
      }

      return {
        ...p,
        stock: stockData.breakdown,
        total_stock: stockData.total,
        stock_in_total: stockData.stockInTotal,
        sales_total: stockData.salesTotal,
        stock_out_total: stockData.stockOutTotal,
        adjustments_total: stockData.adjTotal,
        status,
      };
    });
  }

  /**
   * Get single product with stock
   */
  public static getProductById(productId: string): ProductWithStock | null {
    const products = this.getProductsWithStock();
    return products.find((p) => p.id === productId) || null;
  }

  /**
   * Validates available stock for a product size before a sale or stock-out.
   * Throws friendly error if stock is insufficient.
   */
  public static validateStock(
    productId: string,
    size: SizeKey,
    requestedQty: number
  ): { available: number; isValid: boolean; error?: string } {
    if (requestedQty <= 0) {
      return { available: 0, isValid: false, error: 'Quantity must be greater than 0' };
    }

    const stockMap = this.calculateStock(productId);
    const data = stockMap.get(productId);
    if (!data) {
      return { available: 0, isValid: false, error: 'Product not found in Master Data' };
    }

    const available = data.breakdown[size] || 0;
    if (requestedQty > available) {
      return {
        available,
        isValid: false,
        error: `Insufficient stock for size ${size}. Available quantity: ${available}`,
      };
    }

    return { available, isValid: true };
  }

  /**
   * Returns detailed stock movement history for a product
   */
  public static getProductMovementHistory(productId: string): StockMovementRecord[] {
    const db = dbInstance.getRawData();
    const history: StockMovementRecord[] = [];

    // Stock In movements
    const stockInLookup = new Map(db.stock_in.map((si) => [si.id, si]));
    for (const item of db.stock_in_items) {
      if (item.product_id === productId) {
        const parent = stockInLookup.get(item.stock_in_id);
        if (parent) {
          history.push({
            id: `mov-si-${item.id}`,
            date: parent.date,
            transaction_type: 'Stock In',
            reference: `${parent.vendor} (${parent.invoice_no})`,
            size: item.size,
            quantity: item.quantity,
            direction: '+',
            notes: parent.notes || `Stock intake from vendor ${parent.vendor}`,
            created_at: parent.created_at,
          });
        }
      }
    }

    // Sales movements
    const salesLookup = new Map(db.sales.map((s) => [s.id, s]));
    for (const item of db.sale_items) {
      if (item.product_id === productId) {
        const parent = salesLookup.get(item.sale_id);
        if (parent) {
          history.push({
            id: `mov-sale-${item.id}`,
            date: parent.date,
            transaction_type: 'Sale',
            reference: `${parent.payment_channel} (${parent.invoice_no})`,
            size: item.size,
            quantity: item.quantity,
            direction: '-',
            notes: parent.notes || `Sale via ${parent.payment_channel} (${parent.payment_method})`,
            created_at: parent.created_at,
          });
        }
      }
    }

    // Stock Out movements
    const stockOutLookup = new Map(db.stock_out.map((so) => [so.id, so]));
    for (const item of db.stock_out_items) {
      if (item.product_id === productId) {
        const parent = stockOutLookup.get(item.stock_out_id);
        if (parent) {
          history.push({
            id: `mov-so-${item.id}`,
            date: parent.date,
            transaction_type: 'Stock Out',
            reference: `${parent.reason} - ${parent.recipient_or_purpose}`,
            size: item.size,
            quantity: item.quantity,
            direction: '-',
            notes: parent.notes || `${parent.reason}: ${parent.recipient_or_purpose}`,
            created_at: parent.created_at,
          });
        }
      }
    }

    // Adjustment movements
    for (const adj of db.stock_adjustments) {
      if (adj.product_id === productId) {
        history.push({
          id: `mov-adj-${adj.id}`,
          date: adj.date,
          transaction_type: 'Adjustment',
          reference: `Manual Adjustment (${adj.created_by})`,
          size: adj.size,
          quantity: Math.abs(adj.adjustment_qty),
          direction: adj.adjustment_qty >= 0 ? '+' : '-',
          notes: adj.reason,
          created_at: adj.created_at,
        });
      }
    }

    // Sort by date desc, then created_at desc
    history.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.created_at.localeCompare(a.created_at);
    });

    return history;
  }

  /**
   * Unified transaction ledger containing SALE, STOCK IN, STOCK OUT, EXPENSE, ADJUSTMENT
   */
  public static getUnifiedTransactions(filters?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): UnifiedTransaction[] {
    const db = dbInstance.getRawData();
    const productLookup = new Map(db.products.map((p) => [p.id, p]));
    const transactions: UnifiedTransaction[] = [];

    // 1. Sales
    for (const sale of db.sales) {
      for (const item of sale.items || []) {
        const prod = productLookup.get(item.product_id);
        transactions.push({
          id: `tx-sale-${sale.id}-${item.id}`,
          date: sale.date,
          type: 'SALE',
          product_name: prod?.design || 'Unknown',
          product_code: prod?.code || '-',
          size: item.size,
          quantity: item.quantity,
          direction: '-',
          amount: item.subtotal,
          reference: sale.invoice_no,
          notes: `${sale.payment_channel} (${sale.payment_method}) ${sale.customer_name ? '- ' + sale.customer_name : ''}`,
          created_by: sale.created_by,
          created_at: sale.created_at,
        });
      }
    }

    // 2. Stock In
    for (const si of db.stock_in) {
      for (const item of si.items || []) {
        const prod = productLookup.get(item.product_id);
        transactions.push({
          id: `tx-si-${si.id}-${item.id}`,
          date: si.date,
          type: 'STOCK IN',
          product_name: prod?.design || 'Unknown',
          product_code: prod?.code || '-',
          size: item.size,
          quantity: item.quantity,
          direction: '+',
          amount: item.quantity * item.cost_price,
          reference: `${si.vendor} (${si.invoice_no})`,
          notes: si.notes || `Vendor: ${si.vendor}`,
          created_by: si.created_by,
          created_at: si.created_at,
        });
      }
    }

    // 3. Stock Out
    for (const so of db.stock_out) {
      for (const item of so.items || []) {
        const prod = productLookup.get(item.product_id);
        transactions.push({
          id: `tx-so-${so.id}-${item.id}`,
          date: so.date,
          type: 'STOCK OUT',
          product_name: prod?.design || 'Unknown',
          product_code: prod?.code || '-',
          size: item.size,
          quantity: item.quantity,
          direction: '-',
          amount: item.quantity * (prod?.cost_price || 0),
          reference: so.reference_no,
          notes: `${so.reason}: ${so.recipient_or_purpose}`,
          created_by: so.created_by,
          created_at: so.created_at,
        });
      }
    }

    // 4. Expenses
    for (const exp of db.expenses) {
      transactions.push({
        id: `tx-exp-${exp.id}`,
        date: exp.date,
        type: 'EXPENSE',
        product_name: exp.description,
        product_code: '-',
        size: '-',
        quantity: exp.qty,
        direction: '-',
        amount: exp.total_amount,
        reference: exp.vendor || 'Expense',
        notes: `[${exp.type}] ${exp.notes || exp.description}`,
        created_by: exp.created_by,
        created_at: exp.created_at,
      });
    }

    // 5. Adjustments
    for (const adj of db.stock_adjustments) {
      const prod = productLookup.get(adj.product_id);
      transactions.push({
        id: `tx-adj-${adj.id}`,
        date: adj.date,
        type: 'ADJUSTMENT',
        product_name: prod?.design || 'Unknown',
        product_code: prod?.code || '-',
        size: adj.size,
        quantity: Math.abs(adj.adjustment_qty),
        direction: adj.adjustment_qty >= 0 ? '+' : '-',
        amount: 0,
        reference: 'Stock Audit',
        notes: adj.reason,
        created_by: adj.created_by,
        created_at: adj.created_at,
      });
    }

    // Apply filtering
    let filtered = transactions;
    if (filters?.type && filters.type !== 'ALL') {
      filtered = filtered.filter((t) => t.type === filters.type);
    }
    if (filters?.startDate) {
      filtered = filtered.filter((t) => t.date >= filters.startDate!);
    }
    if (filters?.endDate) {
      filtered = filtered.filter((t) => t.date <= filters.endDate!);
    }
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.product_name && t.product_name.toLowerCase().includes(s)) ||
          (t.product_code && t.product_code.toLowerCase().includes(s)) ||
          t.reference.toLowerCase().includes(s) ||
          t.notes.toLowerCase().includes(s)
      );
    }

    // Sort by date desc, then created_at desc
    filtered.sort((a, b) => {
      const cmp = b.date.localeCompare(a.date);
      if (cmp !== 0) return cmp;
      return b.created_at.localeCompare(a.created_at);
    });

    return filtered;
  }

  /**
   * Calculates Dashboard metrics for a given date range
   */
  public static getDashboardMetrics(startDate?: string, endDate?: string): DashboardMetrics {
    const db = dbInstance.getRawData();
    const productsWithStock = this.getProductsWithStock(endDate);
    const productLookup = new Map(db.products.map((p) => [p.id, p]));

    // Filter sales by date range
    const filteredSales = db.sales.filter((s) => {
      if (startDate && s.date < startDate) return false;
      if (endDate && s.date > endDate) return false;
      return true;
    });

    // Filter stock in by date range
    const filteredStockIn = db.stock_in.filter((si) => {
      if (startDate && si.date < startDate) return false;
      if (endDate && si.date > endDate) return false;
      return true;
    });

    // Filter stock out by date range
    const filteredStockOut = db.stock_out.filter((so) => {
      if (startDate && so.date < startDate) return false;
      if (endDate && so.date > endDate) return false;
      return true;
    });

    // Filter expenses by date range
    const filteredExpenses = db.expenses.filter((e) => {
      if (startDate && e.date < startDate) return false;
      if (endDate && e.date > endDate) return false;
      return true;
    });

    // Metric 1: Total Products
    const total_products = productsWithStock.length;

    // Metric 2: Total Stock (Current stock summed across all products)
    const total_stock = productsWithStock.reduce((acc, p) => acc + p.total_stock, 0);

    // Metric 3: Total Sales & Revenue
    let total_sales_count = filteredSales.length;
    let total_sales_units = 0;
    let total_revenue = 0;
    let total_cogs = 0;

    const productSalesMap = new Map<string, { units: number; revenue: number }>();
    const typeSalesMap = new Map<string, { units: number; revenue: number }>();
    const sizeSalesMap = new Map<SizeKey, number>([
      ['S', 0],
      ['M', 0],
      ['L', 0],
      ['XL', 0],
      ['XXL', 0],
    ]);
    const payMethodMap = new Map<string, { count: number; total: number }>();
    const payChannelMap = new Map<string, { count: number; total: number }>();
    const salesOverTimeMap = new Map<string, { revenue: number; profit: number; units: number }>();

    for (const sale of filteredSales) {
      total_revenue += sale.total_amount;

      // Payment method aggregation
      const curMethod = payMethodMap.get(sale.payment_method) || { count: 0, total: 0 };
      curMethod.count += 1;
      curMethod.total += sale.total_amount;
      payMethodMap.set(sale.payment_method, curMethod);

      // Payment channel aggregation
      const curChan = payChannelMap.get(sale.payment_channel) || { count: 0, total: 0 };
      curChan.count += 1;
      curChan.total += sale.total_amount;
      payChannelMap.set(sale.payment_channel, curChan);

      let saleCogs = 0;
      let saleUnits = 0;

      for (const item of sale.items || []) {
        total_sales_units += item.quantity;
        saleUnits += item.quantity;
        const prod = productLookup.get(item.product_id);
        const itemCost = (prod?.cost_price || 0) * item.quantity;
        total_cogs += itemCost;
        saleCogs += itemCost;

        // Product performance
        const curProd = productSalesMap.get(item.product_id) || { units: 0, revenue: 0 };
        curProd.units += item.quantity;
        curProd.revenue += item.subtotal;
        productSalesMap.set(item.product_id, curProd);

        // Type aggregation
        const pType = prod?.type || 'Other';
        const curType = typeSalesMap.get(pType) || { units: 0, revenue: 0 };
        curType.units += item.quantity;
        curType.revenue += item.subtotal;
        typeSalesMap.set(pType, curType);

        // Size aggregation
        if (item.size in sizeSalesMap) {
          sizeSalesMap.set(item.size, (sizeSalesMap.get(item.size) || 0) + item.quantity);
        }
      }

      // Date over time aggregation
      const curDate = salesOverTimeMap.get(sale.date) || { revenue: 0, profit: 0, units: 0 };
      curDate.revenue += sale.total_amount;
      curDate.profit += (sale.subtotal - saleCogs);
      curDate.units += saleUnits;
      salesOverTimeMap.set(sale.date, curDate);
    }

    // Metric: Gross Profit = Revenue - COGS
    const gross_profit = total_revenue - total_cogs;

    // Metric: Total Expenses
    const total_expenses = filteredExpenses.reduce((acc, e) => acc + e.total_amount, 0);

    // Metric: Net Profit = Gross Profit - Expenses
    const net_profit = gross_profit - total_expenses;

    // Stock overview numbers
    const total_stock_in_units = filteredStockIn.reduce((acc, si) => acc + si.total_qty, 0);
    const total_stock_out_units = filteredStockOut.reduce((acc, so) => acc + so.total_qty, 0);

    let low_stock_count = 0;
    let out_of_stock_count = 0;

    const stock_by_size: StockSizeBreakdown = { S: 0, M: 0, L: 0, XL: 0, XXL: 0 };

    for (const p of productsWithStock) {
      if (p.total_stock === 0) {
        out_of_stock_count++;
      } else if (p.status === 'low_stock') {
        low_stock_count++;
      }
      for (const size of SIZES) {
        stock_by_size[size] += p.stock[size] || 0;
      }
    }

    // Top Selling Products
    const top_selling_products = productsWithStock
      .map((p) => {
        const perf = productSalesMap.get(p.id) || { units: 0, revenue: 0 };
        return {
          id: p.id,
          design: p.design,
          colour: p.colour,
          code: p.code,
          type: p.type,
          units_sold: perf.units,
          revenue: perf.revenue,
          current_stock: p.total_stock,
        };
      })
      .sort((a, b) => b.units_sold - a.units_sold);

    // Format sales over time sorted by date
    const sales_over_time = Array.from(salesOverTimeMap.entries())
      .map(([date, val]) => ({
        date,
        revenue: val.revenue,
        profit: val.profit,
        units: val.units,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Sales by product
    const sales_by_product = Array.from(productSalesMap.entries()).map(([pId, val]) => {
      const prod = productLookup.get(pId);
      return {
        name: prod ? `${prod.design} (${prod.colour})` : 'Unknown',
        code: prod?.code || '-',
        units: val.units,
        revenue: val.revenue,
      };
    }).sort((a, b) => b.units - a.units);

    // Sales by type
    const sales_by_type = Array.from(typeSalesMap.entries()).map(([type, val]) => ({
      type,
      units: val.units,
      revenue: val.revenue,
    })).sort((a, b) => b.revenue - a.revenue);

    // Sales by size
    const sales_by_size = SIZES.map((size) => ({
      size,
      units: sizeSalesMap.get(size) || 0,
    }));

    // Payment methods
    const sales_by_payment_method = Array.from(payMethodMap.entries()).map(([method, val]) => ({
      method,
      count: val.count,
      total: val.total,
    }));

    // Payment channels
    const sales_by_payment_channel = Array.from(payChannelMap.entries()).map(([channel, val]) => ({
      channel,
      count: val.count,
      total: val.total,
    }));

    const recent_transactions = this.getUnifiedTransactions({
      startDate,
      endDate,
    }).slice(0, 10);

    return {
      total_products,
      total_stock,
      total_sales_count,
      total_sales_units,
      total_revenue,
      total_cogs,
      gross_profit,
      total_expenses,
      net_profit,
      total_stock_in_units,
      total_stock_out_units,
      low_stock_count,
      out_of_stock_count,
      stock_by_size,
      sales_over_time,
      sales_by_product,
      sales_by_type,
      sales_by_size,
      sales_by_payment_method,
      sales_by_payment_channel,
      top_selling_products,
      recent_transactions,
    };
  }
}
