import React, { useState } from 'react';
import { Menu, ScanBarcode, AlertTriangle, Plus, Search, MessageSquare } from 'lucide-react';
import { NavPage } from './Sidebar';
import { BarcodeModal } from './BarcodeModal';
import { ProductWithStock, SizeKey } from '../types';

interface HeaderProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  onOpenMobile: () => void;
  lowStockCount: number;
  onSelectProductForPOS?: (product: ProductWithStock, size: SizeKey) => void;
}

const PAGE_TITLES: Record<NavPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Business Overview', subtitle: 'Live inventory metrics, sales performance & profit tracking' },
  master_data: { title: 'Master Data Products', subtitle: 'Centralized product catalogue and computed stock balances' },
  stock_in: { title: 'Stock In Intake', subtitle: 'Record incoming shipment batches from vendors & konveksi' },
  sales_pos: { title: 'POS & New Sale', subtitle: 'Interactive point of sale with real-time stock validation' },
  sales_history: { title: 'Sales Register', subtitle: 'Historical transactions, invoices & customer receipts' },
  stock_out: { title: 'Stock Out', subtitle: 'Endorsements, promotional samples, damaged items & write-offs' },
  adjustments: { title: 'Stock Discrepancy Adjustments', subtitle: 'Physical warehouse audit reconciliations' },
  expenses: { title: 'Pengeluaran (Expenses)', subtitle: 'Operational, manufacturing tags, marketing & business costs' },
  transactions: { title: 'Unified Transaction Ledger', subtitle: 'Consolidated audit trail across all 5 transaction categories' },
  reports: { title: 'Financial & Inventory Reports', subtitle: 'Exportable multi-dimensional analytics & P&L statements' },
  excel: { title: 'Excel Import & Export', subtitle: 'Migrate legacy Excel workbooks and export filtered reports' },
  chat: { title: 'Team Chat & Shift Messages', subtitle: 'Real-time staff communications, inventory notes & shift handovers' },
  settings: { title: 'Settings & Access Control', subtitle: 'Configure retail channels, expense groups and staff accounts' },
};

export const Header: React.FC<HeaderProps> = ({
  currentPage,
  onSelectPage,
  onOpenMobile,
  lowStockCount,
  onSelectProductForPOS,
}) => {
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const info = PAGE_TITLES[currentPage] || { title: 'FEELFST', subtitle: 'Inventory & Sales System' };

  return (
    <>
      <header className="sticky top-0 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-zinc-100 font-['Space_Grotesk'] leading-tight">
              {info.title}
            </h1>
            <p className="hidden sm:block text-xs text-zinc-400 font-normal">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Low Stock Warning Pill */}
          {lowStockCount > 0 && (
            <button
              onClick={() => onSelectPage('master_data')}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs font-medium hover:bg-amber-950/60 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>{lowStockCount} Low/Zero Stock</span>
            </button>
          )}

          {/* Team Chat Quick Button */}
          <button
            onClick={() => onSelectPage('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all ${
              currentPage === 'chat'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border-zinc-800'
            }`}
            title="Open Team Chat & Shift Notes"
          >
            <MessageSquare
              className={`w-3.5 h-3.5 ${
                currentPage === 'chat' ? 'text-white' : 'text-emerald-400'
              }`}
            />
            <span className="hidden sm:inline">Team Chat</span>
          </button>

          {/* Barcode Scanner Button */}
          <button
            onClick={() => setIsBarcodeOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800 text-xs font-semibold shadow-sm transition-all"
            title="Scan barcode or SKU"
          >
            <ScanBarcode className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Barcode Scan</span>
          </button>

          {/* Quick Action: New Sale */}
          {currentPage !== 'sales_pos' && (
            <button
              onClick={() => onSelectPage('sales_pos')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Sale</span>
            </button>
          )}
        </div>
      </header>

      <BarcodeModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onSelectProductForPOS={onSelectProductForPOS}
      />
    </>
  );
};
