export type SizeKey = 'S' | 'M' | 'L' | 'XL' | 'XXL';

export const SIZES: SizeKey[] = ['S', 'M', 'L', 'XL', 'XXL'];

export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  name: string;
  role: UserRole;
  created_at: string;
}

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export interface Product {
  id: string;
  design: string;
  colour: string;
  code: string; // e.g. FLTS-0001-BLK
  type: string; // e.g. T-Shirt, Hoodie, Boardshorts
  cost_price: number;
  retail_price: number;
  created_at: string;
  updated_at: string;
}

export interface StockSizeBreakdown {
  S: number;
  M: number;
  L: number;
  XL: number;
  XXL: number;
}

export interface ProductWithStock extends Product {
  stock: StockSizeBreakdown;
  total_stock: number;
  stock_in_total: number;
  sales_total: number;
  stock_out_total: number;
  adjustments_total: number;
  status: 'out_of_stock' | 'low_stock' | 'in_stock';
}

export interface StockInItem {
  id: string;
  stock_in_id: string;
  product_id: string;
  size: SizeKey;
  quantity: number;
  cost_price: number;
  // Joined fields
  product?: Product;
}

export interface StockIn {
  id: string;
  invoice_no: string;
  date: string; // YYYY-MM-DD
  vendor: string;
  tax: number; // Pajak
  notes: string;
  total_qty: number;
  total_cost: number; // (sum(qty * cost)) + tax
  created_by: string;
  created_at: string;
  items: StockInItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  size: SizeKey;
  quantity: number;
  retail_price: number; // Historical price at sale time
  subtotal: number;
  // Joined fields
  product?: Product;
}

export interface Sale {
  id: string;
  invoice_no: string;
  date: string; // YYYY-MM-DD
  customer_name?: string;
  payment_method: 'Cash' | 'Transfer' | 'E-Commerce';
  payment_channel: string; // e.g. Shopee, BCA, Krisna, Tokopedia
  admin_fee: number;
  subtotal: number;
  total_amount: number; // subtotal + admin_fee
  total_qty: number;
  notes: string;
  created_by: string;
  created_at: string;
  items: SaleItem[];
}

export type StockOutReason =
  | 'Endorsement'
  | 'Sample'
  | 'Damaged'
  | 'Gift'
  | 'Internal Use'
  | 'Event'
  | 'Lost'
  | 'Other';

export interface StockOutItem {
  id: string;
  stock_out_id: string;
  product_id: string;
  size: SizeKey;
  quantity: number;
  cost_price: number;
  product?: Product;
}

export interface StockOut {
  id: string;
  reference_no: string;
  date: string; // YYYY-MM-DD
  reason: StockOutReason;
  recipient_or_purpose: string;
  notes: string;
  total_qty: number;
  created_by: string;
  created_at: string;
  items: StockOutItem[];
}

export type ExpenseCategory =
  | 'Barang'
  | 'Operasional'
  | 'Marketing'
  | 'Shipping'
  | 'Equipment'
  | 'Other';

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  description: string;
  type: ExpenseCategory;
  qty: number;
  total_amount: number; // Harga Total
  vendor: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface StockAdjustment {
  id: string;
  date: string;
  product_id: string;
  size: SizeKey;
  adjustment_qty: number; // + or -
  reason: string;
  created_by: string;
  created_at: string;
  product?: Product;
}

export type TransactionType = 'SALE' | 'STOCK IN' | 'STOCK OUT' | 'EXPENSE' | 'ADJUSTMENT';

export interface UnifiedTransaction {
  id: string;
  date: string;
  type: TransactionType;
  product_name?: string;
  product_code?: string;
  size?: SizeKey | '-';
  quantity: number;
  direction: '+' | '-' | '=';
  amount: number;
  reference: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface StockMovementRecord {
  id: string;
  date: string;
  transaction_type: 'Stock In' | 'Sale' | 'Stock Out' | 'Adjustment';
  reference: string;
  size: SizeKey;
  quantity: number;
  direction: '+' | '-';
  notes: string;
  created_at: string;
}

export interface DashboardMetrics {
  total_products: number;
  total_stock: number;
  total_sales_count: number;
  total_sales_units: number;
  total_revenue: number;
  total_cogs: number;
  gross_profit: number;
  total_expenses: number;
  net_profit: number;
  total_stock_in_units: number;
  total_stock_out_units: number;
  low_stock_count: number;
  out_of_stock_count: number;
  stock_by_size: StockSizeBreakdown;
  sales_over_time: { date: string; revenue: number; profit: number; units: number }[];
  sales_by_product: { name: string; code: string; units: number; revenue: number }[];
  sales_by_type: { type: string; units: number; revenue: number }[];
  sales_by_size: { size: SizeKey; units: number }[];
  sales_by_payment_method: { method: string; count: number; total: number }[];
  sales_by_payment_channel: { channel: string; count: number; total: number }[];
  top_selling_products: {
    id: string;
    design: string;
    colour: string;
    code: string;
    type: string;
    units_sold: number;
    revenue: number;
    current_stock: number;
  }[];
  recent_transactions: UnifiedTransaction[];
}

export interface DateFilterOption {
  key: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'custom' | 'all';
  label: string;
  startDate?: string;
  endDate?: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  username: string;
  name: string;
  role: UserRole;
  message: string;
  created_at: string;
  pinned?: boolean;
}

export interface ChatPresenceUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  online_at: string;
}
