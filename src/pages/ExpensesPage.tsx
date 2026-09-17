import React, { useState, useEffect } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Tag,
  DollarSign,
  Calendar,
  CheckCircle2,
  TrendingDown,
} from 'lucide-react';
import { api } from '../services/api';
import { Expense } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const EXPENSE_TYPES = [
  'Barang',
  'Operasional',
  'Marketing',
  'Shipping',
  'Equipment',
  'Other',
] as const;

export const ExpensesPage: React.FC = () => {
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [type, setType] = useState<(typeof EXPENSE_TYPES)[number]>('Operasional');
  const [qty, setQty] = useState<number>(1);
  const [amount, setAmount] = useState<number>(50000);
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses({
        search,
        type: selectedType === 'ALL' ? undefined : selectedType,
      });
      setExpenses(data);
    } catch (err: any) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [search, selectedType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }
    if (amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      await api.createExpense({
        date,
        description: description.trim(),
        type,
        qty: Number(qty) || 1,
        total_amount: Number(amount),
        vendor: vendor.trim() || '-',
        notes: notes.trim(),
        created_by: user?.name || 'Staff',
      });

      toast.success('Expense logged successfully');
      setDescription('');
      setAmount(50000);
      setVendor('');
      setNotes('');
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record expense');
    }
  };

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Delete expense "${desc}"?`)) return;
    try {
      await api.deleteExpense(id);
      toast.success('Expense removed');
      fetchExpenses();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete expense');
    }
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.total_amount, 0);

  // Group by type
  const typeBreakdown = expenses.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + e.total_amount;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
          Pengeluaran (Expenses)
        </h2>
        <p className="text-xs text-zinc-400">
          Track production materials, operational overhead, marketing campaigns and business costs
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl">
          <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">
            Total Filtered Expenses
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-400 mt-1">
            {formatCurrency(totalExpenseSum)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{expenses.length} expense entries</div>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl sm:col-span-2 flex items-center justify-around flex-wrap gap-2">
          {EXPENSE_TYPES.map((t) => (
            <div key={t} className="text-center px-2 py-1">
              <div className="text-[11px] text-zinc-400 font-medium">{t}</div>
              <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">
                {formatCurrency(typeBreakdown[t] || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Wallet className="w-5 h-5 text-rose-400" />
            <h3 className="font-bold text-base text-zinc-100">Log New Expense</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-200"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Category / Type</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-200"
                >
                  {EXPENSE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-zinc-400 font-semibold block mb-1">
                Description (Detail Pengeluaran)
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Label Leher, Hangtag, Lakban, Bensin..."
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-zinc-100 placeholder-zinc-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-100 font-mono font-bold"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">
                  Total Amount (Harga Total)
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-100 font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Vendor / Store</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Percetakan Jaya"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-200"
                />
              </div>
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional remarks"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-200"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </form>
        </div>

        {/* Expenses List */}
        <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description, vendor..."
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-100"
              />
            </div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-1.5 text-xs text-zinc-200"
            >
              <option value="ALL">All Expense Types</option>
              {EXPENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs">
                No expenses found matching filters.
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between text-xs hover:border-zinc-750 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-zinc-200 text-sm">{exp.description}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                        {exp.type}
                      </span>
                    </div>
                    <div className="text-zinc-500 text-[11px] mt-0.5">
                      {formatDate(exp.date)} &bull; Vendor: {exp.vendor} &bull; By: {exp.created_by}
                      {exp.notes && ` (${exp.notes})`}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold font-mono text-rose-400 text-sm">
                        {formatCurrency(exp.total_amount)}
                      </div>
                      {exp.qty > 1 && (
                        <div className="text-[10px] text-zinc-500">Qty: {exp.qty}</div>
                      )}
                    </div>

                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(exp.id, exp.description)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
