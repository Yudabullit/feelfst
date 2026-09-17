import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Calendar,
  CreditCard,
  PieChart as PieChartIcon,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { api } from '../services/api';
import { DashboardMetrics, SizeKey, SIZES } from '../types';
import { formatCurrency, formatDate } from '../lib/format';

interface DashboardProps {
  onNavigate: (page: any) => void;
}

type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month' | 'last_month' | 'this_year' | 'all' | 'custom';

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [topSortBy, setTopSortBy] = useState<'units' | 'revenue' | 'stock'>('units');

  const getDateRange = (preset: DatePreset) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();

    const formatDateStr = (dt: Date) => dt.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        return { start: formatDateStr(now), end: formatDateStr(now) };
      case 'yesterday': {
        const yest = new Date(now);
        yest.setDate(d - 1);
        return { start: formatDateStr(yest), end: formatDateStr(yest) };
      }
      case 'this_week': {
        const firstDay = new Date(now);
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        firstDay.setDate(diff);
        return { start: formatDateStr(firstDay), end: formatDateStr(now) };
      }
      case 'this_month': {
        const firstOfMonth = new Date(y, m, 1);
        return { start: formatDateStr(firstOfMonth), end: formatDateStr(now) };
      }
      case 'last_month': {
        const firstOfLastMonth = new Date(y, m - 1, 1);
        const lastOfLastMonth = new Date(y, m, 0);
        return { start: formatDateStr(firstOfLastMonth), end: formatDateStr(lastOfLastMonth) };
      }
      case 'this_year': {
        const firstOfYear = new Date(y, 0, 1);
        return { start: formatDateStr(firstOfYear), end: formatDateStr(now) };
      }
      case 'custom':
        return { start: customStart || undefined, end: customEnd || undefined };
      case 'all':
      default:
        return { start: undefined, end: undefined };
    }
  };

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange(datePreset);
      const data = await api.getDashboardMetrics(start, end);
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [datePreset, customStart, customEnd]);

  if (loading && !metrics) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-zinc-900 rounded-xl w-64"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-2xl border border-zinc-800"></div>
          ))}
        </div>
      </div>
    );
  }

  const m = metrics!;

  const sortedTopSelling = [...(m?.top_selling_products || [])].sort((a, b) => {
    if (topSortBy === 'revenue') return b.revenue - a.revenue;
    if (topSortBy === 'stock') return b.current_stock - a.current_stock;
    return b.units_sold - a.units_sold;
  });

  const sizeColors: Record<SizeKey, string> = {
    S: '#10b981',
    M: '#3b82f6',
    L: '#8b5cf6',
    XL: '#f59e0b',
    XXL: '#ec4899',
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/70 border border-zinc-800 p-3 sm:p-4 rounded-2xl backdrop-blur-sm">
        <div className="flex items-center gap-2 text-zinc-300 text-xs font-semibold uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Timeline Filter</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { key: 'all', label: 'All Time' },
              { key: 'today', label: 'Today' },
              { key: 'yesterday', label: 'Yesterday' },
              { key: 'this_week', label: 'This Week' },
              { key: 'this_month', label: 'This Month' },
              { key: 'last_month', label: 'Last Month' },
              { key: 'this_year', label: 'This Year' },
              { key: 'custom', label: 'Custom' },
            ] as const
          ).map((preset) => (
            <button
              key={preset.key}
              onClick={() => setDatePreset(preset.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                datePreset === preset.key
                  ? 'bg-zinc-100 text-zinc-950 font-bold shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            onClick={fetchMetrics}
            className="p-1.5 ml-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {datePreset === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
          <span className="text-xs text-zinc-400 font-medium">Select Range:</span>
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          />
          <span className="text-xs text-zinc-500">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-zinc-950 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
          />
        </div>
      )}

      {/* Primary Financial & Stock KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            {formatCurrency(m.total_revenue)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
            <span>{m.total_sales_count} sales transactions</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
            {formatCurrency(m.gross_profit)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Revenue - COGS ({formatCurrency(m.total_cogs)})
          </div>
        </div>

        {/* Business Expenses */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expenses (Pengeluaran)</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-300">
            {formatCurrency(m.total_expenses)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Operational &amp; production costs</div>
        </div>

        {/* Net Profit */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-800/40 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
              Net Profit
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold font-mono ${
              m.net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCurrency(m.net_profit)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Gross Profit - Total Expenses</div>
        </div>

        {/* Total Stock */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Current Stock</span>
            <Package className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            {m.total_stock} <span className="text-sm font-normal text-zinc-400">pcs</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Across {m.total_products} Master Products
          </div>
        </div>

        {/* Units Sold */}
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Units Sold</span>
            <ShoppingBag className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            {m.total_sales_units} <span className="text-sm font-normal text-zinc-400">pcs</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Customer retail sales volume</div>
        </div>

        {/* Low Stock Warning */}
        <div
          onClick={() => onNavigate('master_data')}
          className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-800/40 hover:border-amber-700/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock (≤ 5)</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300">
            {m.low_stock_count} <span className="text-sm font-normal text-zinc-400">items</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Click to review products</div>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => onNavigate('master_data')}
          className="p-5 rounded-2xl bg-zinc-900/60 border border-rose-800/40 hover:border-rose-700/70 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock (0)</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400">
            {m.out_of_stock_count} <span className="text-sm font-normal text-zinc-400">items</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">Requires re-order from vendor</div>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk']">
              Revenue &amp; Gross Profit Trend
            </h3>
            <p className="text-xs text-zinc-400">Sales performance over timeline</p>
          </div>
        </div>

        {m.sales_over_time.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 text-sm">
            No sales recorded in the selected timeline.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.sales_over_time} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 11 }}
                  tickFormatter={(val) => `Rp ${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-950 border border-zinc-700 p-3 rounded-xl shadow-xl text-xs space-y-1">
                          <div className="font-semibold text-zinc-200">{formatDate(data.date)}</div>
                          <div className="text-emerald-400 font-mono">
                            Revenue: {formatCurrency(data.revenue)}
                          </div>
                          <div className="text-blue-400 font-mono">
                            Profit: {formatCurrency(data.profit)}
                          </div>
                          <div className="text-zinc-400">Units: {data.units} pcs</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#revGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Stock Breakdown & Size Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory by Size Breakdown (Section 18) */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk']">
              Live Stock by Size (Total: {m.total_stock} pcs)
            </h3>
            <p className="text-xs text-zinc-400">Current available inventory per size SKU</p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {SIZES.map((size) => {
              const qty = m.stock_by_size[size] || 0;
              const pct = m.total_stock > 0 ? ((qty / m.total_stock) * 100).toFixed(0) : '0';
              return (
                <div
                  key={size}
                  className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl text-center flex flex-col justify-between"
                >
                  <div className="text-xs font-bold text-zinc-300">{size}</div>
                  <div className="my-1 text-base font-bold font-mono text-zinc-100">{qty}</div>
                  <div className="text-[10px] text-zinc-400">{pct}%</div>
                  <div className="w-full bg-zinc-800 h-1 rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: sizeColors[size],
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sales by Size Chart */}
          <div className="pt-3 border-t border-zinc-800">
            <div className="text-xs font-semibold text-zinc-300 mb-2">Sales Demand by Size:</div>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.sales_by_size} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <XAxis dataKey="size" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} pcs sold`, 'Sales Volume']}
                    contentStyle={{
                      backgroundColor: '#09090b',
                      borderColor: '#3f3f46',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="units" radius={[4, 4, 0, 0]}>
                    {m.sales_by_size.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={sizeColors[entry.size]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Sales by Product Type & Payment Channels */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk']">
              Revenue by Product Category
            </h3>
            <p className="text-xs text-zinc-400">Sales volume per garment type</p>
          </div>

          <div className="space-y-3">
            {m.sales_by_type.map((item) => {
              const maxRev = Math.max(...m.sales_by_type.map((t) => t.revenue), 1);
              const barPct = ((item.revenue / maxRev) * 100).toFixed(0);

              return (
                <div key={item.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-zinc-300">{item.type}</span>
                    <span className="font-mono text-zinc-400">{formatCurrency(item.revenue)} ({item.units} pcs)</span>
                  </div>
                  <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden border border-zinc-800">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${barPct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Payment Channels Breakdown */}
          <div className="pt-4 border-t border-zinc-800 space-y-2">
            <div className="text-xs font-semibold text-zinc-300">Sales Channels &amp; Methods:</div>
            <div className="flex flex-wrap gap-2">
              {m.sales_by_payment_channel.map((chan) => (
                <div
                  key={chan.channel}
                  className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs flex items-center gap-1.5"
                >
                  <CreditCard className="w-3 h-3 text-zinc-400" />
                  <span className="font-medium text-zinc-300">{chan.channel}:</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(chan.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stock Overview Flow (Stock In vs Sales vs Stock Out) */}
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk']">
              Stock Flow Overview
            </h3>
            <p className="text-xs text-zinc-400">Inventory movement balance in timeline</p>
          </div>

          <div className="space-y-3">
            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-400">Total Stock In Intake</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">+{m.total_stock_in_units} pcs</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                INTAKE
              </span>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-400">Sales Deductions</div>
                <div className="text-sm font-bold text-rose-400 mt-0.5">-{m.total_sales_units} pcs</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-mono">
                SALES
              </span>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-400">Non-Sales Stock Out (Endorsement/Samples)</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">-{m.total_stock_out_units} pcs</div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                STOCK OUT
              </span>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-700 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs text-zinc-300 font-medium">Net Warehouse Inventory</div>
                <div className="text-base font-bold text-zinc-100 font-mono mt-0.5">
                  {m.total_stock} pcs
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700 font-mono">
                BALANCED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Products (Section 16) */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk']">
              Product Performance
            </h3>
            <p className="text-xs text-zinc-400">Measurable sales rankings &amp; current stock status</p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-xl text-xs">
            <span className="text-zinc-400 px-2">Sort by:</span>
            <button
              onClick={() => setTopSortBy('units')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                topSortBy === 'units' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Units Sold
            </button>
            <button
              onClick={() => setTopSortBy('revenue')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                topSortBy === 'revenue' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setTopSortBy('stock')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                topSortBy === 'stock' ? 'bg-zinc-800 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Current Stock
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 text-xs font-semibold uppercase">
                <th className="pb-3">Product SKU</th>
                <th className="pb-3">Design &amp; Colour</th>
                <th className="pb-3">Type</th>
                <th className="pb-3 text-right">Units Sold</th>
                <th className="pb-3 text-right">Revenue</th>
                <th className="pb-3 text-right">Current Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {sortedTopSelling.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="py-3 font-mono text-xs font-medium text-emerald-400">{p.code}</td>
                  <td className="py-3">
                    <div className="font-semibold text-zinc-200">{p.design}</div>
                    <div className="text-xs text-zinc-400">{p.colour}</div>
                  </td>
                  <td className="py-3 text-zinc-400 text-xs">{p.type}</td>
                  <td className="py-3 text-right font-bold text-zinc-100 font-mono">
                    {p.units_sold} pcs
                  </td>
                  <td className="py-3 text-right font-mono text-zinc-200">
                    {formatCurrency(p.revenue)}
                  </td>
                  <td className="py-3 text-right font-mono">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        p.current_stock === 0
                          ? 'bg-rose-950 text-rose-400 border border-rose-800'
                          : p.current_stock <= 5
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      {p.current_stock} pcs
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions Feed */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-100 font-['Space_Grotesk']">
              Recent Activity Feed
            </h3>
            <p className="text-xs text-zinc-400">Latest unified stock &amp; sales events</p>
          </div>
          <button
            onClick={() => onNavigate('transactions')}
            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
          >
            View All Ledger &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5">Type</th>
                <th className="pb-2.5">Product / Item</th>
                <th className="pb-2.5">Size</th>
                <th className="pb-2.5 text-right">Qty</th>
                <th className="pb-2.5 text-right">Amount</th>
                <th className="pb-2.5">Reference / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {m.recent_transactions.slice(0, 8).map((tx) => (
                <tr key={tx.id} className="hover:bg-zinc-850/40 transition-colors">
                  <td className="py-2.5 text-zinc-400">{formatDate(tx.date)}</td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
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
                      {tx.type}
                    </span>
                  </td>
                  <td className="py-2.5">
                    <div className="font-semibold text-zinc-200">{tx.product_name}</div>
                    {tx.product_code !== '-' && (
                      <div className="text-[11px] font-mono text-zinc-400">{tx.product_code}</div>
                    )}
                  </td>
                  <td className="py-2.5 font-bold font-mono text-zinc-300">{tx.size}</td>
                  <td className="py-2.5 text-right font-mono font-bold">
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
                      {tx.quantity}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-zinc-300">
                    {tx.amount > 0 ? formatCurrency(tx.amount) : '-'}
                  </td>
                  <td className="py-2.5 text-zinc-400 max-w-xs truncate">
                    <span className="font-medium text-zinc-300">{tx.reference}</span>
                    {tx.notes && <span className="ml-1 text-zinc-500">({tx.notes})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
