import React, { useState, useEffect } from 'react';
import {
  ArrowUpFromLine,
  Plus,
  Calendar,
  AlertTriangle,
  UserCheck,
  Trash2,
  CheckCircle2,
  PackageMinus,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, StockOut, SizeKey, SIZES, StockOutReason } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

const REASONS: StockOutReason[] = [
  'Endorsement',
  'Sample',
  'Damaged',
  'Gift',
  'Internal Use',
  'Event',
  'Lost',
  'Other',
];

export const StockOutPage: React.FC = () => {
  const toast = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [stockOuts, setStockOuts] = useState<StockOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<SizeKey>('M');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<StockOutReason>('Endorsement');
  const [recipient, setRecipient] = useState<string>('Band Lolot (Tour Sponsor)');
  const [notes, setNotes] = useState<string>('Endorsement campaign apparel');

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [pList, soList] = await Promise.all([api.getProducts(), api.getStockOuts()]);
      setProducts(pList);
      setStockOuts(soList);
      if (pList.length > 0 && !selectedProductId) {
        setSelectedProductId(pList[0].id);
      }
    } catch (err: any) {
      toast.error('Failed to load stock out data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const availableStock = selectedProduct ? selectedProduct.stock[selectedSize] || 0 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId || !selectedProduct) {
      toast.error('Please select a product');
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    if (quantity > availableStock) {
      toast.error(
        `Insufficient stock: ${selectedProduct.design} (${selectedSize}) only has ${availableStock} pcs in stock.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await api.createStockOut({
        date,
        reason,
        recipient_or_purpose: recipient.trim() || reason,
        items: [
          {
            product_id: selectedProductId,
            size: selectedSize,
            quantity: Number(quantity),
          },
        ],
        notes: notes.trim(),
        created_by: user?.name || 'Staff',
      });

      toast.success(
        `Successfully logged ${quantity} pcs stock out for ${selectedProduct.design} (${reason})`
      );

      // Reset
      setQuantity(1);
      setRecipient('');
      setNotes('');

      await fetchInitial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit stock out');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, ref: string) => {
    if (!confirm(`Delete Stock Out #${ref}? This will return inventory to warehouse.`)) return;
    try {
      await api.deleteStockOut(id);
      toast.success(`Stock Out #${ref} deleted and inventory restored.`);
      fetchInitial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
          Stock Out (Non-Sales)
        </h2>
        <p className="text-xs text-zinc-400">
          Deduct inventory for endorsements, samples, events, photo shoots, or damaged write-offs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <PackageMinus className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-base text-zinc-100">Record Stock Out</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date & Reason */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Reason / Purpose</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as StockOutReason)}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Product Selector */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.design} - {p.colour} ({p.code}) [{p.total_stock} pcs left]
                  </option>
                ))}
              </select>
            </div>

            {/* Size SKU Selector & Live Available Count (Section 9) */}
            {selectedProduct && (
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                  Select Size to Deduct:
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((size) => {
                    const avail = selectedProduct.stock[size] || 0;
                    const isSelected = selectedSize === size;
                    const hasStock = avail > 0;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          !hasStock
                            ? 'opacity-40 border-zinc-800 bg-zinc-900 text-zinc-500'
                            : isSelected
                            ? 'border-amber-500 bg-amber-950/40 text-amber-300 ring-1 ring-amber-500'
                            : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{size}</div>
                        <div className="text-[10px] font-mono mt-0.5">{avail} left</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  max={availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs flex items-center justify-between">
                <span className="text-zinc-400">Available:</span>
                <span
                  className={`font-mono font-bold ${
                    availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {availableStock} pcs
                </span>
              </div>
            </div>

            {/* Recipient */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">
                Recipient / Event / Purpose
              </label>
              <input
                type="text"
                required
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="e.g. Endorse Band Lolot / Photo Shoot"
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional audit reference"
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting || availableStock <= 0 || quantity > availableStock}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Recording...' : 'Submit Stock Out'}</span>
            </button>
          </form>
        </div>

        {/* Stock Out Records Table */}
        <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-zinc-100">Stock Out Audit Register</h3>
            </div>
            <span className="text-xs text-zinc-400">{stockOuts.length} transactions</span>
          </div>

          <div className="space-y-2.5">
            {stockOuts.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No non-sales Stock Out records logged yet.
              </div>
            ) : (
              stockOuts.map((so) => {
                const totalUnits = so.items.reduce((s, it) => s + it.quantity, 0);

                return (
                  <div
                    key={so.id}
                    className="p-3.5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          #{so.reference_no}
                        </span>
                        <span className="text-xs text-zinc-400">&bull; {formatDate(so.date)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold font-mono">
                          {so.reason}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDelete(so.id, so.reference_no)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                        title="Delete & Restore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-zinc-200">
                          Purpose: {so.recipient_or_purpose}
                        </div>
                        {so.notes && <div className="text-zinc-500 text-[11px]">{so.notes}</div>}
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-rose-400 text-sm">
                          -{totalUnits} pcs
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-850 flex flex-wrap gap-2 text-[11px]">
                      {so.items.map((it, i) => {
                        const prod = products.find((p) => p.id === it.product_id);
                        return (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono"
                          >
                            {prod ? prod.design : 'Product'} ({it.size}): -{it.quantity}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
