import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Minus,
  AlertTriangle,
  CheckCircle2,
  History,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  RefreshCw,
  Package,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, StockAdjustment, SizeKey, SIZES } from '../types';
import { formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

type AdjustmentMode = 'decrease' | 'increase' | 'exact';

const REASON_PRESETS = [
  { label: 'Stock Opname Shortage', mode: 'decrease', text: 'Stock opname audit finding (Physical shortage)' },
  { label: 'Damaged / Defective', mode: 'decrease', text: 'Damaged or defective goods written off' },
  { label: 'Lost / Shrinkage', mode: 'decrease', text: 'Warehouse shrinkage / item missing' },
  { label: 'Sample / Display', mode: 'decrease', text: 'Used for photoshoot / sample not returned' },
  { label: 'Surplus Stock Found', mode: 'increase', text: 'Physical surplus found during warehouse audit' },
  { label: 'Entry Error Correction', mode: 'both', text: 'Correction of previous data entry error' },
];

export const StockAdjustmentPage: React.FC = () => {
  const toast = useToast();
  const { user, isAdmin } = useAuth();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [productId, setProductId] = useState('');
  const [size, setSize] = useState<SizeKey>('M');
  const [mode, setMode] = useState<AdjustmentMode>('decrease');
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [exactCountInput, setExactCountInput] = useState<number>(0);
  const [reason, setReason] = useState('Stock opname audit finding (Physical shortage)');

  // History Table Search & Filter
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'decrease' | 'increase'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pList, aList] = await Promise.all([api.getProducts(), api.getAdjustments()]);
      setProducts(pList);
      setAdjustments(aList);
      if (pList.length > 0 && !productId) {
        setProductId(pList[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load adjustments: ' + (err.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProduct = products.find((p) => p.id === productId);
  const currentSizeStock = selectedProduct ? selectedProduct.stock[size] || 0 : 0;

  // Calculate final adjustment quantity (+ or -)
  let finalAdjustmentQty = 0;
  if (mode === 'decrease') {
    finalAdjustmentQty = -Math.abs(qtyInput || 0);
  } else if (mode === 'increase') {
    finalAdjustmentQty = Math.abs(qtyInput || 0);
  } else if (mode === 'exact') {
    finalAdjustmentQty = (exactCountInput || 0) - currentSizeStock;
  }

  const newProjectedStock = currentSizeStock + finalAdjustmentQty;
  const isNegativeStock = newProjectedStock < 0;
  const isZeroChange = finalAdjustmentQty === 0;

  // Auto-sync exact count input when switching size or product or mode
  useEffect(() => {
    if (mode === 'exact') {
      setExactCountInput(currentSizeStock);
    }
  }, [productId, size, mode, currentSizeStock]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Please select a product');
      return;
    }
    if (isZeroChange) {
      toast.error('Adjustment quantity cannot be 0. Please specify a change.');
      return;
    }
    if (isNegativeStock) {
      toast.error(
        `Adjustment would result in negative stock (${newProjectedStock} pcs). Current available is ${currentSizeStock} pcs.`
      );
      return;
    }
    if (!reason.trim()) {
      toast.error('Please provide an audit justification or reason.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createAdjustment({
        date,
        product_id: productId,
        size,
        adjustment_qty: finalAdjustmentQty,
        quantity_change: finalAdjustmentQty, // Fallback compatibility
        reason: reason.trim(),
        created_by: user?.name || 'Admin',
      });

      const actionText = finalAdjustmentQty > 0 ? `+${finalAdjustmentQty} pcs added` : `${finalAdjustmentQty} pcs deducted`;
      toast.success(`Stock adjusted successfully: ${actionText} for size ${size}.`);
      
      // Reset form quantity
      setQtyInput(1);
      if (mode === 'exact') {
        setExactCountInput(newProjectedStock);
      }
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply adjustment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdjustment = async (id: string) => {
    setDeleting(true);
    try {
      await api.deleteAdjustment(id);
      toast.success('Stock adjustment record deleted and inventory rolled back.');
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete adjustment');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered adjustments
  const filteredAdjustments = adjustments.filter((adj) => {
    const prod = products.find((p) => p.id === adj.product_id);
    const textMatch =
      !historySearch ||
      (prod?.design || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      (prod?.code || '').toLowerCase().includes(historySearch.toLowerCase()) ||
      adj.reason.toLowerCase().includes(historySearch.toLowerCase()) ||
      adj.created_by.toLowerCase().includes(historySearch.toLowerCase()) ||
      adj.size.toLowerCase().includes(historySearch.toLowerCase());

    const qty = adj.adjustment_qty;
    if (historyFilter === 'decrease' && qty >= 0) return false;
    if (historyFilter === 'increase' && qty <= 0) return false;

    return textMatch;
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-zinc-400">
        <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-3" />
        <h3 className="text-lg font-bold text-zinc-100">Admin Restricted</h3>
        <p className="text-xs text-zinc-500 mt-1">
          Only administrators can perform physical inventory adjustments.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100 flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-purple-400" />
            <span>Stock Discrepancy &amp; Opname Adjustments</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Reconcile physical warehouse rack counts with digital records by deducting shortages or recording found surpluses.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 self-start sm:self-auto border border-zinc-700/60"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Stock</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Adjustment Tool */}
        <div className="lg:col-span-5 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              <span>Audit Adjustment Form</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-purple-950/60 text-purple-300 border border-purple-800/50">
              Live Stock Sync
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* 1. Date and Product */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-zinc-400 font-semibold block mb-1">Audit Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-200 font-mono text-xs focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-zinc-400 font-semibold block mb-1">Product to Reconcile</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-100 font-medium text-xs focus:border-purple-500 focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.design} - {p.colour} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Interactive Size Selector with Current Stock Breakdown */}
            {selectedProduct && (
              <div className="space-y-2 bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between text-zinc-400">
                  <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>Select Size to Adjust:</span>
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Total on Hand: <strong className="text-zinc-200 font-mono">{selectedProduct.total_stock} pcs</strong>
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((s) => {
                    const count = selectedProduct.stock[s] || 0;
                    const isSelected = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSize(s)}
                        className={`p-2 rounded-xl text-center transition-all border ${
                          isSelected
                            ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-md scale-[1.02]'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                        }`}
                      >
                        <div className="font-bold text-xs">{s}</div>
                        <div
                          className={`font-mono text-[11px] font-semibold mt-0.5 ${
                            count === 0 ? 'text-rose-400' : count <= 3 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {count}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Adjustment Action / Direction Selector */}
            <div>
              <label className="text-zinc-400 font-semibold block mb-1.5">
                Adjustment Direction &amp; Operation
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* DECREASE BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('decrease');
                    setReason('Stock opname audit finding (Physical shortage)');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                    mode === 'decrease'
                      ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md ring-1 ring-rose-500/50'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1 text-rose-400">
                    <Minus className="w-4 h-4 stroke-[3]" />
                    <span>Deduct (-)</span>
                  </div>
                  <span className="text-[10px] font-normal text-rose-300/80">Physical Shortage</span>
                </button>

                {/* INCREASE BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('increase');
                    setReason('Physical surplus found during warehouse audit');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                    mode === 'increase'
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 shadow-md ring-1 ring-emerald-500/50'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Add (+)</span>
                  </div>
                  <span className="text-[10px] font-normal text-emerald-300/80">Found Surplus</span>
                </button>

                {/* EXACT COUNT BUTTON */}
                <button
                  type="button"
                  onClick={() => {
                    setMode('exact');
                    setExactCountInput(currentSizeStock);
                    setReason('Stock Opname actual physical count reconciliation');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all border ${
                    mode === 'exact'
                      ? 'bg-purple-950/80 border-purple-500 text-purple-200 shadow-md ring-1 ring-purple-500/50'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-1 text-purple-400">
                    <span className="font-mono text-sm font-bold">=</span>
                    <span>Exact Count</span>
                  </div>
                  <span className="text-[10px] font-normal text-purple-300/80">Opname Count</span>
                </button>
              </div>
            </div>

            {/* 4. Quantity Adjuster Input (Stepper & Quick buttons) */}
            {mode === 'exact' ? (
              <div className="space-y-2 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <label className="text-zinc-400 font-semibold block text-xs">
                  Physical Count Verified in Warehouse (Size {size}):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExactCountInput((prev) => Math.max(0, prev - 1))}
                    className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl flex items-center justify-center transition-colors border border-zinc-700 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={exactCountInput}
                    onChange={(e) => setExactCountInput(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-center bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-3 text-zinc-100 font-mono font-bold text-base focus:border-purple-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setExactCountInput((prev) => prev + 1)}
                    className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl flex items-center justify-center transition-colors border border-zinc-700 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="text-[11px] text-zinc-400 text-center">
                  System currently records <strong className="text-zinc-200 font-mono">{currentSizeStock} pcs</strong>.
                  Adjustment will be{' '}
                  <strong
                    className={`font-mono ${
                      finalAdjustmentQty < 0
                        ? 'text-rose-400'
                        : finalAdjustmentQty > 0
                        ? 'text-emerald-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {finalAdjustmentQty > 0 ? `+${finalAdjustmentQty}` : finalAdjustmentQty} pcs
                  </strong>
                  .
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="text-zinc-400 font-semibold text-xs">
                    {mode === 'decrease' ? 'Quantity to Deduct / Reduce:' : 'Quantity to Add / Increase:'}
                  </label>
                  {mode === 'decrease' && currentSizeStock > 0 && (
                    <button
                      type="button"
                      onClick={() => setQtyInput(currentSizeStock)}
                      className="text-[11px] text-rose-400 hover:underline font-semibold"
                    >
                      Zero out ({currentSizeStock} pcs)
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQtyInput((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl flex items-center justify-center transition-colors border border-zinc-700 shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="relative flex-1">
                    <span
                      className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono text-base ${
                        mode === 'decrease' ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {mode === 'decrease' ? '-' : '+'}
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={qtyInput}
                      onChange={(e) => setQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-center bg-zinc-900 border border-zinc-700 rounded-xl py-2 px-8 text-zinc-100 font-mono font-bold text-base focus:border-purple-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 font-semibold text-xs">
                      pcs
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQtyInput((prev) => prev + 1)}
                    className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-xl flex items-center justify-center transition-colors border border-zinc-700 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Add Pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-zinc-400">Quick set:</span>
                  {[1, 2, 5, 10, 20].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQtyInput(amt)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-colors ${
                        qtyInput === amt
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-850 hover:bg-zinc-750 text-zinc-300'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Live Projected Impact Card */}
            {selectedProduct && (
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider flex items-center justify-between border-b border-zinc-850 pb-1.5">
                  <span>Inventory Impact Preview</span>
                  <span className="text-zinc-400 font-mono">Size {size}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center py-1">
                  <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-400">Current Stock</div>
                    <div className="font-mono font-bold text-sm text-zinc-200 mt-0.5">
                      {currentSizeStock} pcs
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-lg border ${
                      finalAdjustmentQty < 0
                        ? 'bg-rose-950/40 border-rose-800/50'
                        : finalAdjustmentQty > 0
                        ? 'bg-emerald-950/40 border-emerald-800/50'
                        : 'bg-zinc-900/80 border-zinc-800/80'
                    }`}
                  >
                    <div className="text-[10px] text-zinc-400">Delta Change</div>
                    <div
                      className={`font-mono font-bold text-sm mt-0.5 ${
                        finalAdjustmentQty < 0
                          ? 'text-rose-400'
                          : finalAdjustmentQty > 0
                          ? 'text-emerald-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {finalAdjustmentQty > 0 ? `+${finalAdjustmentQty}` : finalAdjustmentQty} pcs
                    </div>
                  </div>

                  <div
                    className={`p-2 rounded-lg border ${
                      isNegativeStock
                        ? 'bg-rose-950/80 border-rose-500'
                        : newProjectedStock === 0
                        ? 'bg-amber-950/50 border-amber-600/60'
                        : 'bg-zinc-900/80 border-zinc-800/80'
                    }`}
                  >
                    <div className="text-[10px] text-zinc-400">New Recorded</div>
                    <div
                      className={`font-mono font-bold text-sm mt-0.5 ${
                        isNegativeStock
                          ? 'text-rose-400'
                          : newProjectedStock === 0
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {newProjectedStock} pcs
                    </div>
                  </div>
                </div>

                {isNegativeStock && (
                  <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Cannot reduce stock below 0. Max reduction possible for size {size} is{' '}
                      <strong>{currentSizeStock} pcs</strong>.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 6. Preset Reasons and Custom Text */}
            <div className="space-y-1.5">
              <label className="text-zinc-400 font-semibold block text-xs">
                Audit Reason / Justification
              </label>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 pb-1">
                {REASON_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setReason(preset.text);
                      if (preset.mode === 'decrease' && mode !== 'decrease') setMode('decrease');
                      if (preset.mode === 'increase' && mode !== 'increase') setMode('increase');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors border ${
                      reason === preset.text
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Stock opname audit finding (Physical shortage)"
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-zinc-200 text-xs focus:border-purple-500 focus:outline-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || isZeroChange || isNegativeStock}
              className={`w-full py-3 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                isNegativeStock || isZeroChange
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                  : mode === 'decrease'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-950/50'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Recording Adjustment...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Apply {finalAdjustmentQty < 0 ? `Reduction (${finalAdjustmentQty} pcs)` : `Addition (+${finalAdjustmentQty} pcs)`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Adjustment Audit Trail */}
        <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
                <History className="w-5 h-5 text-zinc-400" />
                <span>Adjustment Audit Trail</span>
              </h3>
              <div className="text-[11px] text-zinc-400 mt-0.5">
                {adjustments.length} total adjustment logs recorded
              </div>
            </div>

            {/* Direction Filter Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setHistoryFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
                  historyFilter === 'all'
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('decrease')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                  historyFilter === 'decrease'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                    : 'text-zinc-400 hover:text-rose-400'
                }`}
              >
                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                <span>Decreases (-)</span>
              </button>
              <button
                type="button"
                onClick={() => setHistoryFilter('increase')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                  historyFilter === 'increase'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                    : 'text-zinc-400 hover:text-emerald-400'
                }`}
              >
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                <span>Increases (+)</span>
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              placeholder="Search audit trail by product name, code, reason, or auditor..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* List of Adjustments */}
          <div className="space-y-2.5 overflow-y-auto max-h-[560px] pr-1 flex-1">
            {filteredAdjustments.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center">
                <SlidersHorizontal className="w-10 h-10 text-zinc-700 mb-2" />
                <span>No stock adjustments matching your criteria.</span>
                <span className="text-[11px] text-zinc-600 mt-0.5">
                  Use the form on the left to record your physical count audits.
                </span>
              </div>
            ) : (
              filteredAdjustments.map((adj) => {
                const prod = products.find((p) => p.id === adj.product_id);
                const isDeduction = adj.adjustment_qty < 0;
                return (
                  <div
                    key={adj.id}
                    className="p-3.5 bg-zinc-950/80 border border-zinc-800/90 hover:border-zinc-700 rounded-xl flex items-center justify-between text-xs transition-all gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-200">
                          {prod ? prod.design : 'Product'}
                        </span>
                        <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-mono text-[10px] font-semibold">
                          Size {adj.size}
                        </span>
                        {prod?.code && (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            ({prod.code})
                          </span>
                        )}
                        <span className="text-zinc-500 text-[11px]">&bull; {formatDate(adj.date)}</span>
                      </div>

                      <div className="text-zinc-400 text-[11px] flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-300 font-medium">{adj.reason}</span>
                        <span className="text-zinc-500">&bull; Logged by: {adj.created_by}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div
                        className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs flex items-center gap-1 border ${
                          isDeduction
                            ? 'bg-rose-950/70 border-rose-800/80 text-rose-300'
                            : 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                        }`}
                      >
                        {isDeduction ? (
                          <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>
                          {adj.adjustment_qty > 0 ? `+${adj.adjustment_qty}` : adj.adjustment_qty} pcs
                        </span>
                      </div>

                      {/* Delete action button */}
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(adj.id)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors"
                        title="Delete / Rollback this adjustment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-zinc-100">Revert Stock Adjustment?</h3>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to delete this adjustment record? The inventory quantities will be rolled back automatically to their pre-adjustment values.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => handleDeleteAdjustment(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Reverting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

