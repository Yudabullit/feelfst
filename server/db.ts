import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  Product,
  StockIn,
  StockInItem,
  Sale,
  SaleItem,
  StockOut,
  StockOutItem,
  Expense,
  StockAdjustment,
  User,
  SizeKey,
  ChatMessage,
} from '../src/types';

export interface DatabaseSchema {
  users: User[];
  products: Product[];
  stock_in: StockIn[];
  stock_in_items: StockInItem[];
  sales: Sale[];
  sale_items: SaleItem[];
  stock_out: StockOut[];
  stock_out_items: StockOutItem[];
  expenses: Expense[];
  stock_adjustments: StockAdjustment[];
  chat_messages: ChatMessage[];
  payment_channels: string[];
  expense_categories: string[];
  settings: {
    shop_name: string;
    low_stock_threshold: number;
    currency: string;
  };
}

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'feelfst_database.json');

function generateInitialSeed(): DatabaseSchema {
  const adminHash = bcrypt.hashSync('admin123', 10);
  const staffHash = bcrypt.hashSync('staff123', 10);

  const users: User[] = [
    {
      id: 'usr-admin-01',
      username: 'admin',
      password_hash: adminHash,
      name: 'FEELFST Admin',
      role: 'admin',
      created_at: '2026-09-01T08:00:00.000Z',
    },
    {
      id: 'usr-staff-01',
      username: 'staff',
      password_hash: staffHash,
      name: 'Cashier Staff',
      role: 'staff',
      created_at: '2026-09-01T08:30:00.000Z',
    },
  ];

  const p1: Product = {
    id: 'prod-001',
    design: 'MOUTH SQUASH',
    colour: 'BLACK',
    code: 'FLTS-0001-BLK',
    type: 'T-Shirt',
    cost_price: 90000,
    retail_price: 150000,
    created_at: '2026-09-01T09:00:00.000Z',
    updated_at: '2026-09-01T09:00:00.000Z',
  };

  const p2: Product = {
    id: 'prod-002',
    design: 'WAVE RIDER',
    colour: 'WHITE',
    code: 'FLTS-0002-WHT',
    type: 'T-Shirt',
    cost_price: 90000,
    retail_price: 160000,
    created_at: '2026-09-01T09:30:00.000Z',
    updated_at: '2026-09-01T09:30:00.000Z',
  };

  const p3: Product = {
    id: 'prod-003',
    design: 'BALI BREEZE',
    colour: 'SAGE',
    code: 'FLTS-0003-SGE',
    type: 'T-Shirt',
    cost_price: 95000,
    retail_price: 165000,
    created_at: '2026-09-01T10:00:00.000Z',
    updated_at: '2026-09-01T10:00:00.000Z',
  };

  const p4: Product = {
    id: 'prod-004',
    design: 'SUNSET TUBE',
    colour: 'NAVY',
    code: 'FLHO-0004-NVY',
    type: 'Hoodie',
    cost_price: 180000,
    retail_price: 320000,
    created_at: '2026-09-01T10:30:00.000Z',
    updated_at: '2026-09-01T10:30:00.000Z',
  };

  const p5: Product = {
    id: 'prod-005',
    design: 'BARREL RUSH',
    colour: 'BLACK',
    code: 'FLBS-0005-BLK',
    type: 'Boardshorts',
    cost_price: 120000,
    retail_price: 220000,
    created_at: '2026-09-01T11:00:00.000Z',
    updated_at: '2026-09-01T11:00:00.000Z',
  };

  const products = [p1, p2, p3, p4, p5];

  // Stock In: 03 Sep 2026 Made Konveksi for MOUTH SQUASH BLACK (S:5, M:5, L:2, XL:1, XXL:3 = 16)
  const stockInId1 = 'stkin-001';
  const stockInItems1: StockInItem[] = [
    { id: 'stkitem-101', stock_in_id: stockInId1, product_id: p1.id, size: 'S', quantity: 5, cost_price: 90000 },
    { id: 'stkitem-102', stock_in_id: stockInId1, product_id: p1.id, size: 'M', quantity: 5, cost_price: 90000 },
    { id: 'stkitem-103', stock_in_id: stockInId1, product_id: p1.id, size: 'L', quantity: 2, cost_price: 90000 },
    { id: 'stkitem-104', stock_in_id: stockInId1, product_id: p1.id, size: 'XL', quantity: 1, cost_price: 90000 },
    { id: 'stkitem-105', stock_in_id: stockInId1, product_id: p1.id, size: 'XXL', quantity: 3, cost_price: 90000 },
  ];

  const stockIn1: StockIn = {
    id: stockInId1,
    invoice_no: 'IN-2026-0901',
    date: '2026-09-03',
    vendor: 'Made Konveksi',
    tax: 150000,
    notes: 'Batch 1 Summer Collection - Mouth Squash',
    total_qty: 16,
    total_cost: 16 * 90000 + 150000,
    created_by: 'FEELFST Admin',
    created_at: '2026-09-03T10:00:00.000Z',
    items: stockInItems1,
  };

  // Stock In 2: 01 Sep 2026 for other products
  const stockInId2 = 'stkin-002';
  const stockInItems2: StockInItem[] = [
    { id: 'stkitem-201', stock_in_id: stockInId2, product_id: p2.id, size: 'S', quantity: 4, cost_price: 90000 },
    { id: 'stkitem-202', stock_in_id: stockInId2, product_id: p2.id, size: 'M', quantity: 6, cost_price: 90000 },
    { id: 'stkitem-203', stock_in_id: stockInId2, product_id: p2.id, size: 'L', quantity: 6, cost_price: 90000 },
    { id: 'stkitem-204', stock_in_id: stockInId2, product_id: p2.id, size: 'XL', quantity: 4, cost_price: 90000 },
    { id: 'stkitem-205', stock_in_id: stockInId2, product_id: p2.id, size: 'XXL', quantity: 2, cost_price: 90000 },

    { id: 'stkitem-206', stock_in_id: stockInId2, product_id: p3.id, size: 'S', quantity: 3, cost_price: 95000 },
    { id: 'stkitem-207', stock_in_id: stockInId2, product_id: p3.id, size: 'M', quantity: 4, cost_price: 95000 },
    { id: 'stkitem-208', stock_in_id: stockInId2, product_id: p3.id, size: 'L', quantity: 4, cost_price: 95000 },
    { id: 'stkitem-209', stock_in_id: stockInId2, product_id: p3.id, size: 'XL', quantity: 2, cost_price: 95000 },
    { id: 'stkitem-210', stock_in_id: stockInId2, product_id: p3.id, size: 'XXL', quantity: 1, cost_price: 95000 },

    { id: 'stkitem-211', stock_in_id: stockInId2, product_id: p4.id, size: 'S', quantity: 2, cost_price: 180000 },
    { id: 'stkitem-212', stock_in_id: stockInId2, product_id: p4.id, size: 'M', quantity: 3, cost_price: 180000 },
    { id: 'stkitem-213', stock_in_id: stockInId2, product_id: p4.id, size: 'L', quantity: 3, cost_price: 180000 },
    { id: 'stkitem-214', stock_in_id: stockInId2, product_id: p4.id, size: 'XL', quantity: 2, cost_price: 180000 },
    { id: 'stkitem-215', stock_in_id: stockInId2, product_id: p4.id, size: 'XXL', quantity: 1, cost_price: 180000 },
  ];

  const totalQty2 = stockInItems2.reduce((acc, it) => acc + it.quantity, 0);
  const totalCost2 = stockInItems2.reduce((acc, it) => acc + it.quantity * it.cost_price, 0) + 120000;

  const stockIn2: StockIn = {
    id: stockInId2,
    invoice_no: 'IN-2026-0902',
    date: '2026-09-01',
    vendor: 'Garmen Bali Utama',
    tax: 120000,
    notes: 'Pre-season inventory intake',
    total_qty: totalQty2,
    total_cost: totalCost2,
    created_by: 'FEELFST Admin',
    created_at: '2026-09-01T14:00:00.000Z',
    items: stockInItems2,
  };

  const allStockIn = [stockIn1, stockIn2];
  const allStockInItems = [...stockInItems1, ...stockInItems2];

  // Sales:
  // 1. 03 Sep 2026: S = 1 for MOUTH SQUASH BLACK
  const sale1Id = 'sale-001';
  const saleItem1: SaleItem = {
    id: 'sitem-001',
    sale_id: sale1Id,
    product_id: p1.id,
    size: 'S',
    quantity: 1,
    retail_price: 150000,
    subtotal: 150000,
  };
  const sale1: Sale = {
    id: sale1Id,
    invoice_no: 'INV-20260903-01',
    date: '2026-09-03',
    customer_name: 'Bima Satria',
    payment_method: 'E-Commerce',
    payment_channel: 'Shopee',
    admin_fee: 2500,
    subtotal: 150000,
    total_amount: 152500,
    total_qty: 1,
    notes: 'Order Shopee #SPX-8821',
    created_by: 'Cashier Staff',
    created_at: '2026-09-03T14:22:00.000Z',
    items: [saleItem1],
  };

  // 2. 04 Sep 2026: M = 2 for MOUTH SQUASH BLACK
  const sale2Id = 'sale-002';
  const saleItem2: SaleItem = {
    id: 'sitem-002',
    sale_id: sale2Id,
    product_id: p1.id,
    size: 'M',
    quantity: 2,
    retail_price: 150000,
    subtotal: 300000,
  };
  const sale2: Sale = {
    id: sale2Id,
    invoice_no: 'INV-20260904-01',
    date: '2026-09-04',
    customer_name: 'Putu Ary',
    payment_method: 'E-Commerce',
    payment_channel: 'Shopee',
    admin_fee: 2500,
    subtotal: 300000,
    total_amount: 302500,
    total_qty: 2,
    notes: 'Order Shopee #SPX-8930',
    created_by: 'Cashier Staff',
    created_at: '2026-09-04T11:45:00.000Z',
    items: [saleItem2],
  };

  // 3. 05 Sep 2026: XL = 1 for MOUTH SQUASH BLACK
  const sale3Id = 'sale-003';
  const saleItem3: SaleItem = {
    id: 'sitem-003',
    sale_id: sale3Id,
    product_id: p1.id,
    size: 'XL',
    quantity: 1,
    retail_price: 150000,
    subtotal: 150000,
  };
  const sale3: Sale = {
    id: sale3Id,
    invoice_no: 'INV-20260905-01',
    date: '2026-09-05',
    customer_name: 'Wayan Yoga',
    payment_method: 'Transfer',
    payment_channel: 'BCA',
    admin_fee: 0,
    subtotal: 150000,
    total_amount: 150000,
    total_qty: 1,
    notes: 'Transfer via BCA Klik',
    created_by: 'Cashier Staff',
    created_at: '2026-09-05T16:10:00.000Z',
    items: [saleItem3],
  };

  // 4. Additional sales on Wave Rider & Bali Breeze
  const sale4Id = 'sale-004';
  const saleItem4a: SaleItem = {
    id: 'sitem-004a',
    sale_id: sale4Id,
    product_id: p2.id,
    size: 'M',
    quantity: 2,
    retail_price: 160000,
    subtotal: 320000,
  };
  const saleItem4b: SaleItem = {
    id: 'sitem-004b',
    sale_id: sale4Id,
    product_id: p3.id,
    size: 'L',
    quantity: 1,
    retail_price: 165000,
    subtotal: 165000,
  };
  const sale4: Sale = {
    id: sale4Id,
    invoice_no: 'INV-20260905-02',
    date: '2026-09-05',
    customer_name: 'Store Walk-in',
    payment_method: 'Cash',
    payment_channel: 'Krisna',
    admin_fee: 0,
    subtotal: 485000,
    total_amount: 485000,
    total_qty: 3,
    notes: 'POS Walk-in Krisna Outlet',
    created_by: 'Cashier Staff',
    created_at: '2026-09-05T17:30:00.000Z',
    items: [saleItem4a, saleItem4b],
  };

  const sales = [sale1, sale2, sale3, sale4];
  const saleItems = [saleItem1, saleItem2, saleItem3, saleItem4a, saleItem4b];

  // Stock Out:
  // 06 Sep 2026: L = 2 for MOUTH SQUASH BLACK, Reason: Endorsement, Reference: Endorse Band Lolot
  const stockOut1Id = 'stkout-001';
  const stockOutItem1: StockOutItem = {
    id: 'stkoitem-001',
    stock_out_id: stockOut1Id,
    product_id: p1.id,
    size: 'L',
    quantity: 2,
    cost_price: 90000,
  };
  const stockOut1: StockOut = {
    id: stockOut1Id,
    reference_no: 'SO-20260906-01',
    date: '2026-09-06',
    reason: 'Endorsement',
    recipient_or_purpose: 'Endorse Band Lolot',
    notes: 'Endorse Band Lolot for Denpasar Festival stage appearance',
    total_qty: 2,
    created_by: 'FEELFST Admin',
    created_at: '2026-09-06T13:00:00.000Z',
    items: [stockOutItem1],
  };

  const stockOuts = [stockOut1];
  const stockOutItems = [stockOutItem1];

  // Expenses / Pengeluaran:
  // 06 Sep 2026: Tag, Type: Barang, Qty: 100, Total: 2000000, Vendor: Dika tag, Notes: Pembuatan Label
  const exp1: Expense = {
    id: 'exp-001',
    date: '2026-09-06',
    description: 'Tag',
    type: 'Barang',
    qty: 100,
    total_amount: 2000000,
    vendor: 'Dika tag',
    notes: 'Pembuatan Label',
    created_by: 'FEELFST Admin',
    created_at: '2026-09-06T15:00:00.000Z',
  };

  const exp2: Expense = {
    id: 'exp-002',
    date: '2026-09-04',
    description: 'Packaging Polymailer & Stickers',
    type: 'Operasional',
    qty: 250,
    total_amount: 375000,
    vendor: 'Surya Packaging',
    notes: 'Biodegradable mailer bags with FEELFST print',
    created_by: 'FEELFST Admin',
    created_at: '2026-09-04T09:15:00.000Z',
  };

  const expenses = [exp1, exp2];

  return {
    users,
    products,
    stock_in: allStockIn,
    stock_in_items: allStockInItems,
    sales,
    sale_items: saleItems,
    stock_out: stockOuts,
    stock_out_items: stockOutItems,
    expenses,
    stock_adjustments: [],
    chat_messages: [
      {
        id: 'msg-001',
        user_id: 'usr-admin-01',
        username: 'admin',
        name: 'FEELFST Admin',
        role: 'admin',
        message: 'Welcome to FEELFST Team Chat! Use this space for shift handovers, inventory alerts, and team messages.',
        created_at: '2026-09-17T02:00:00.000Z',
        pinned: true,
      },
      {
        id: 'msg-002',
        user_id: 'usr-staff-01',
        username: 'staff',
        name: 'Cashier Staff',
        role: 'staff',
        message: 'Cashier register ready for today. Noticed Mouth Squash (Black) size M has 5 pcs left in stock.',
        created_at: '2026-09-17T03:30:00.000Z',
      },
    ],
    payment_channels: ['Shopee', 'BCA', 'Krisna', 'Tokopedia', 'Mandiri', 'Cashier'],
    expense_categories: ['Barang', 'Operasional', 'Marketing', 'Shipping', 'Equipment', 'Other'],
    settings: {
      shop_name: 'FEELFST Clothing & Surf',
      low_stock_threshold: 5,
      currency: 'IDR',
    },
  };
}

class RelationalDatabase {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirectory();
    this.data = this.loadOrCreate();
  }

  private ensureDirectory() {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  }

  private loadOrCreate(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Ensure all required table arrays exist
        if (
          parsed.products &&
          parsed.stock_in &&
          parsed.sales &&
          parsed.stock_out &&
          parsed.expenses &&
          parsed.users
        ) {
          if (!Array.isArray(parsed.chat_messages)) {
            parsed.chat_messages = [
              {
                id: 'msg-001',
                user_id: 'usr-admin-01',
                username: 'admin',
                name: 'FEELFST Admin',
                role: 'admin',
                message: 'Welcome to FEELFST Team Chat! Use this space for shift handovers, inventory alerts, and team messages.',
                created_at: new Date().toISOString(),
                pinned: true,
              },
            ];
            this.persist(parsed);
          }
          return parsed;
        }
      } catch (err) {
        console.error('Failed to parse database file, re-initializing seed:', err);
      }
    }
    const initial = generateInitialSeed();
    this.persist(initial);
    return initial;
  }

  private persist(dataToSave?: DatabaseSchema) {
    try {
      this.ensureDirectory();
      const content = JSON.stringify(dataToSave || this.data, null, 2);
      fs.writeFileSync(DB_FILE, content, 'utf-8');
    } catch (err) {
      console.error('Error persisting database to disk:', err);
    }
  }

  public save() {
    this.persist();
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  public resetToSeed(): DatabaseSchema {
    this.data = generateInitialSeed();
    this.save();
    return this.data;
  }
}

export const dbInstance = new RelationalDatabase();
