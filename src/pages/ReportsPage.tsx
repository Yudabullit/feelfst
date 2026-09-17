import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Layers,
  Filter,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, DashboardMetrics, UnifiedTransaction } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';

type ReportTab = 'inventory' | 'sales' | 'profit_loss' | 'movement' | 'expenses';

export const ReportsPage: React.FC = () => {
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<ReportTab>('inventory');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);

  // Data
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inventory') {
        const p = await api.getProducts();
        setProducts(p);
      } else if (activeTab === 'profit_loss') {
        const m = await api.getDashboardMetrics(startDate || undefined, endDate || undefined);
        setMetrics(m);
      } else {
        const t = await api.getTransactions({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          type: activeTab === 'sales' ? 'SALE' : activeTab === 'expenses' ? 'EXPENSE' : undefined,
        });
        setTransactions(t);
      }
    } catch (err: any) {
      toast.error('Failed to compile report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab, startDate, endDate]);

  const handleExport = (format: 'xlsx' | 'csv') => {
    const reportType =
      activeTab === 'inventory'
        ? 'master_data'
        : activeTab === 'sales'
        ? 'sales'
        : activeTab === 'profit_loss'
        ? 'profit_loss'
        : activeTab === 'expenses'
        ? 'expenses'
        : 'stock_movement';

    const query = new URLSearchParams({
      reportType,
      format,
    });
    if (startDate) query.append('startDate', startDate);
    if (endDate) query.append('endDate', endDate);

    window.open(`/api/excel/export?${query.toString()}`, '_blank');
    toast.success(`Exporting ${reportType} as ${format.toUpperCase()}...`);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
            Financial &amp; Inventory Reports
          </h2>
          <p className="text-xs text-zinc-400">
            Exportable tabular statements, stock valuation, profit &amp; loss and audit summaries
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Tabs & Date Range Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'inventory', label: 'Inventory Valuation' },
              { id: 'sales', label: 'Sales Performance' },
              { id: 'profit_loss', label: 'Profit & Loss Statement' },
              { id: 'movement', label: 'Stock Movement Ledger' },
              { id: 'expenses', label: 'Operational Expenses' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-zinc-100 text-zinc-950 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-400">Date Range:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-750 text-zinc-200 rounded-lg px-2.5 py-1"
          />
          <span className="text-zinc-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-zinc-950 border border-zinc-750 text-zinc-200 rounded-lg px-2.5 py-1"
          />
        </div>
      </div>

      {/* Report Content Panels */}
      {activeTab === 'profit_loss' && metrics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="text-xs text-zinc-400">Gross Sales Revenue</div>
              <div className="text-xl font-bold font-mono text-zinc-100 mt-1">
                {formatCurrency(metrics.total_revenue)}
              </div>
            </div>
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="text-xs text-zinc-400">Cost of Goods Sold (COGS)</div>
              <div className="text-xl font-bold font-mono text-zinc-300 mt-1">
                {formatCurrency(metrics.total_cogs)}
              </div>
            </div>
            <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
              <div className="text-xs text-zinc-400">Operating Expenses</div>
              <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                {formatCurrency(metrics.total_expenses)}
              </div>
            </div>
            <div className="p-4 bg-zinc-900/60 border border-emerald-800/40 rounded-2xl">
              <div className="text-xs text-emerald-400">Net Business Profit</div>
              <div
                className={`text-xl font-bold font-mono mt-1 ${
                  metrics.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(metrics.net_profit)}
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-base text-zinc-100 font-['Space_Grotesk'] mb-4">
              Detailed Income Statement
            </h3>
            <table className="w-full text-left text-xs">
              <tbody className="divide-y divide-zinc-800">
                <tr>
                  <td className="py-3 font-semibold text-zinc-200">Total Sales Revenue</td>
                  <td className="py-3 text-right font-mono font-bold text-zinc-100">
                    {formatCurrency(metrics.total_revenue)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-zinc-400">Less: Cost of Goods Sold (COGS)</td>
                  <td className="py-3 text-right font-mono text-zinc-400">
                    ({formatCurrency(metrics.total_cogs)})
                  </td>
                </tr>
                <tr className="bg-zinc-950/40 font-bold">
                  <td className="py-3 text-emerald-300">Gross Margin Profit</td>
                  <td className="py-3 text-right font-mono text-emerald-300">
                    {formatCurrency(metrics.gross_profit)}
                  </td>
                </tr>
                <tr>
                  <td className="py-3 text-zinc-400">Less: General &amp; Operational Expenses (Pengeluaran)</td>
                  <td className="py-3 text-right font-mono text-rose-400">
                    ({formatCurrency(metrics.total_expenses)})
                  </td>
                </tr>
                <tr className="bg-zinc-950 font-bold text-sm">
                  <td className="py-4 text-zinc-100">NET BOTTOM LINE PROFIT</td>
                  <td
                    className={`py-4 text-right font-mono text-base ${
                      metrics.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(metrics.net_profit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <th className="py-3 px-4">SKU Code</th>
                  <th className="py-3 px-3">Design &amp; Colour</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-2 text-center">S</th>
                  <th className="py-3 px-2 text-center">M</th>
                  <th className="py-3 px-2 text-center">L</th>
                  <th className="py-3 px-2 text-center">XL</th>
                  <th className="py-3 px-2 text-center">XXL</th>
                  <th className="py-3 px-3 text-center">Total Stock</th>
                  <th className="py-3 px-3 text-right">Cost Value</th>
                  <th className="py-3 px-4 text-right">Retail Potential</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {products.map((p) => {
                  const costVal = p.total_stock * p.cost_price;
                  const retailVal = p.total_stock * p.retail_price;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-850/40">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{p.code}</td>
                      <td className="py-3 px-3 font-semibold text-zinc-200">
                        {p.design} - {p.colour}
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{p.type}</td>
                      <td className="py-3 px-2 text-center font-mono">{p.stock.S || 0}</td>
                      <td className="py-3 px-2 text-center font-mono">{p.stock.M || 0}</td>
                      <td className="py-3 px-2 text-center font-mono">{p.stock.L || 0}</td>
                      <td className="py-3 px-2 text-center font-mono">{p.stock.XL || 0}</td>
                      <td className="py-3 px-2 text-center font-mono">{p.stock.XXL || 0}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-zinc-100">
                        {p.total_stock}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-300">
                        {formatCurrency(costVal)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {formatCurrency(retailVal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(activeTab === 'sales' || activeTab === 'movement' || activeTab === 'expenses') && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Product / Detail</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-2 text-center">Size</th>
                  <th className="py-3 px-3 text-right">Quantity</th>
                  <th className="py-3 px-3 text-right">Amount</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-850/40">
                    <td className="py-3 px-4 text-zinc-400">{formatDate(tx.date)}</td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-zinc-200">{tx.product_name}</td>
                    <td className="py-3 px-3 font-mono text-zinc-400">{tx.product_code}</td>
                    <td className="py-3 px-2 text-center font-bold font-mono text-zinc-300">
                      {tx.size}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      {tx.direction}
                      {tx.quantity} pcs
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-medium text-zinc-100">
                      {tx.amount > 0 ? formatCurrency(tx.amount) : '-'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400 max-w-xs truncate">{tx.reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
