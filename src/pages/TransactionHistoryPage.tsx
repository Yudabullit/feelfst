import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Calendar,
  Filter,
  ArrowDownToLine,
  ShoppingCart,
  ArrowUpFromLine,
  Wallet,
  SlidersHorizontal,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { UnifiedTransaction } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';

export const TransactionHistoryPage: React.FC = () => {
  const toast = useToast();

  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedType, setSelectedType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await api.getTransactions({
        type: selectedType === 'ALL' ? undefined : selectedType,
        search,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setTransactions(data);
    } catch (err: any) {
      toast.error('Failed to load transaction ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedType, search, startDate, endDate]);

  const typeIcons: Record<string, React.ElementType> = {
    SALE: ShoppingCart,
    'STOCK IN': ArrowDownToLine,
    'STOCK OUT': ArrowUpFromLine,
    EXPENSE: Wallet,
    ADJUSTMENT: SlidersHorizontal,
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
            Unified Transaction Ledger
          </h2>
          <p className="text-xs text-zinc-400">
            Full chronological audit trail across Sales, Stock In, Stock Out, Expenses and Adjustments
          </p>
        </div>

        <button
          onClick={fetchTransactions}
          className="flex items-center gap-2 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 text-xs font-semibold rounded-xl self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        {/* Search */}
        <div className="sm:col-span-4 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, SKU, invoice #, reference..."
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100"
          />
        </div>

        {/* Type Filter */}
        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200"
          >
            <option value="ALL">All 5 Transaction Types</option>
            <option value="SALE">Sales (Penjualan)</option>
            <option value="STOCK IN">Stock In (Barang Masuk)</option>
            <option value="STOCK OUT">Stock Out (Endorse/Sample)</option>
            <option value="EXPENSE">Expenses (Pengeluaran)</option>
            <option value="ADJUSTMENT">Stock Adjustments (Audit)</option>
          </select>
        </div>

        {/* Date From */}
        <div className="sm:col-span-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200"
            title="Start Date"
          />
        </div>

        {/* Date To */}
        <div className="sm:col-span-2">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200"
            title="End Date"
          />
        </div>

        {/* Reset */}
        <div className="sm:col-span-1 flex items-center justify-center">
          <button
            onClick={() => {
              setSelectedType('ALL');
              setSearch('');
              setStartDate('');
              setEndDate('');
            }}
            className="text-xs text-zinc-400 hover:text-zinc-200"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Product / Description</th>
                <th className="py-3 px-3">SKU Code</th>
                <th className="py-3 px-2 text-center">Size</th>
                <th className="py-3 px-3 text-right">Quantity</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-4">Reference &amp; Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    Loading ledger entries...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-500">
                    No transactions found matching active filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const Icon = typeIcons[tx.type] || History;

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 px-4 text-zinc-400 font-mono">{formatDate(tx.date)}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold font-mono ${
                            tx.type === 'SALE'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : tx.type === 'STOCK IN'
                              ? 'bg-blue-950 text-blue-400 border border-blue-800'
                              : tx.type === 'STOCK OUT'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : tx.type === 'EXPENSE'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-purple-950 text-purple-300 border border-purple-800'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{tx.type}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold text-zinc-200">
                        {tx.product_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {tx.product_code !== '-' ? tx.product_code : '-'}
                      </td>
                      <td className="py-3 px-2 text-center font-bold font-mono text-zinc-300">
                        {tx.size}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span
                          className={
                            tx.direction === '+'
                              ? 'text-emerald-400'
                              : tx.direction === '-'
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }
                        >
                          {tx.direction}
                          {tx.quantity} pcs
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-200 font-medium">
                        {tx.amount > 0 ? formatCurrency(tx.amount) : '-'}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">
                        <span className="font-semibold text-zinc-300">{tx.reference}</span>
                        {tx.notes && <span className="ml-1 text-zinc-500">({tx.notes})</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
