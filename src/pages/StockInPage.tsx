import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Calendar,
  Building2,
  Trash2,
  CheckCircle2,
  Receipt,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  PackagePlus,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, StockIn, SizeKey, SIZES } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface StockInPageProps {
  onNavigate?: (page: any) => void;
}

export const StockInPage: React.FC<StockInPageProps> = ({ onNavigate }) => {
  const toast = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [stockIns, setStockIns] = useState<StockIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<StockIn | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState<string>('Made Konveksi');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<SizeKey, number>>({
    S: 0,
    M: 0,
    L: 0,
    XL: 0,
    XXL: 0,
  });
  const [costPrice, setCostPrice] = useState<number>(90000);
  const [tax, setTax] = useState<number>(0);
  const [notes, setNotes] = useState<string>('Production batch shipment');

  const fetchInitial = async () => {
    setLoading(true);
    try {
      const [pList, sList] = await Promise.all([api.getProducts(), api.getStockIns()]);
      setProducts(pList || []);
      setStockIns(sList || []);
      if (pList && pList.length > 0) {
        if (!selectedProductId || !pList.some((p) => p.id === selectedProductId)) {
          setSelectedProductId(pList[0].id);
          setCostPrice(pList[0].cost_price);
        }
      } else {
        setSelectedProductId('');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load stock in data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  const handleProductChange = (pId: string) => {
    setSelectedProductId(pId);
    const found = products.find((p) => p.id === pId);
    if (found) {
      setCostPrice(found.cost_price);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const totalQuantity = SIZES.reduce((acc, s) => acc + (Number(quantities[s]) || 0), 0);
  const subtotal = totalQuantity * costPrice;
  const grandTotal = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductId) {
      toast.error('Please select a product from Master Data');
      return;
    }

    if (totalQuantity <= 0) {
      toast.error('Please enter at least 1 unit in size quantities');
      return;
    }

    setSubmitting(true);
    try {
      const items = SIZES.filter((s) => (quantities[s] || 0) > 0).map((size) => ({
        product_id: selectedProductId,
        size,
        quantity: Number(quantities[size]),
        cost_price: Number(costPrice),
      }));

      await api.createStockIn({
        date,
        vendor: vendor.trim() || 'Vendor',
        items,
        tax: Number(tax) || 0,
        notes: notes.trim(),
        created_by: user?.name || 'Staff',
      });

      toast.success(`Successfully stocked in ${totalQuantity} pcs for ${selectedProduct?.design || 'product'}`);

      // Reset quantities
      setQuantities({ S: 0, M: 0, L: 0, XL: 0, XXL: 0 });
      setNotes('Production batch shipment');

      // Refresh data
      await fetchInitial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit stock in');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await api.deleteStockIn(deleteTarget.id);
      toast.success(`Stock In #${deleteTarget.invoice_no} removed successfully.`);
      setDeleteTarget(null);
      await fetchInitial();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
          Stock In Entry
        </h2>
        <p className="text-xs text-zinc-400">
          Intake new inventory from vendors and konveksi to increment stock by size
        </p>
      </div>

      {/* Warning Banner if No Products Exist in Master Data */}
      {products.length === 0 && !loading && (
        <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-bold text-xs text-amber-100">No Products Found in Master Data</p>
              <p className="text-[11px] text-amber-300/80">
                You must have at least one product created before you can record shipment stock in batches.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('master_data')}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow transition-colors shrink-0 flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Go to Master Data</span>
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Intake Card */}
        <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
            <ArrowDownToLine className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-zinc-100">Intake Shipment Batch</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Date & Vendor */}
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
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Vendor / Konveksi</label>
                <input
                  type="text"
                  required
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="e.g. Made Konveksi"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Product Selector */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.design} - {p.colour} ({p.code}) [{p.type}]
                  </option>
                ))}
              </select>
            </div>

            {/* Selected Product Info Preview */}
            {selectedProduct && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Design &amp; Colour:</span>
                  <span className="font-semibold text-zinc-200">
                    {selectedProduct.design} &bull; {selectedProduct.colour}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">SKU Code &amp; Type:</span>
                  <span className="font-mono text-emerald-400">
                    {selectedProduct.code} ({selectedProduct.type})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Current Stock:</span>
                  <span className="font-mono font-bold text-zinc-200">
                    {selectedProduct.total_stock} pcs
                  </span>
                </div>
              </div>
            )}

            {/* Sizes Multi-Input Grid (Section 6) */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1.5">
                Quantities per Size SKU:
              </label>
              <div className="grid grid-cols-5 gap-2">
                {SIZES.map((size) => (
                  <div key={size} className="text-center">
                    <label className="text-xs font-bold text-zinc-300 block mb-1">{size}</label>
                    <input
                      type="number"
                      min={0}
                      value={quantities[size]}
                      onChange={(e) =>
                        setQuantities({
                          ...quantities,
                          [size]: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full text-center bg-zinc-950 border border-zinc-750 rounded-xl py-2 text-xs font-mono font-bold text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Cost & Tax */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Cost per Item (Harga Pokok)
                </label>
                <input
                  type="number"
                  min={0}
                  value={costPrice}
                  onChange={(e) => setCostPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Tax / Pajak</label>
                <input
                  type="number"
                  min={0}
                  value={tax}
                  onChange={(e) => setTax(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-zinc-400 block mb-1">Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or batch reference"
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Real-time Calculation Summary (Section 6) */}
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Total Quantity:</span>
                <span className="font-mono font-bold text-zinc-200">{totalQuantity} pcs</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal ({totalQuantity} &times; {formatCurrency(costPrice)}):</span>
                <span className="font-mono text-zinc-200">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Pajak (Tax):</span>
                <span className="font-mono text-zinc-200">{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-emerald-400 pt-2 border-t border-zinc-800">
                <span>Grand Total:</span>
                <span className="font-mono">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || totalQuantity === 0}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Recording Intake...' : 'Submit Stock In'}</span>
            </button>
          </form>
        </div>

        {/* History of Stock In Records */}
        <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-base text-zinc-100">Stock In Shipment History</h3>
            </div>
            <span className="text-xs text-zinc-400">{stockIns.length} recorded batches</span>
          </div>

          <div className="space-y-3">
            {stockIns.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                No Stock In shipments recorded yet.
              </div>
            ) : (
              stockIns.map((si) => {
                const isExpanded = expandedId === si.id;
                const totalUnits = si.items.reduce((sum, it) => sum + it.quantity, 0);

                return (
                  <div
                    key={si.id}
                    className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-3 transition-colors hover:border-zinc-750"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400">
                            #{si.invoice_no}
                          </span>
                          <span className="text-xs text-zinc-400">&bull; {formatDate(si.date)}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-850 text-zinc-300 font-mono">
                            {si.vendor}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {totalUnits} pcs total &bull; Recorded by {si.created_by}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold font-mono text-zinc-100">
                            {formatCurrency(si.total_cost ?? (si as any).total_amount ?? 0)}
                          </div>
                          {si.tax > 0 && (
                            <div className="text-[10px] text-zinc-400">
                              Incl. {formatCurrency(si.tax)} tax
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : si.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                          title="Toggle Item Details"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteTarget(si)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                          title="Delete Stock In"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Items List */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-zinc-850 space-y-2 text-xs">
                        <div className="font-semibold text-zinc-300">Items in this Batch:</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {si.items.map((it, idx) => {
                            const prod = products.find((p) => p.id === it.product_id);
                            return (
                              <div
                                key={idx}
                                className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between"
                              >
                                <div>
                                  <div className="font-medium text-zinc-200">
                                    {prod ? prod.design : 'Product'} ({it.size})
                                  </div>
                                  <div className="text-[11px] font-mono text-zinc-400">
                                    {prod?.code || it.product_id}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold font-mono text-emerald-400">
                                    +{it.quantity} pcs
                                  </div>
                                  <div className="text-[10px] text-zinc-400">
                                    @ {formatCurrency(it.cost_price)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {si.notes && (
                          <div className="text-[11px] text-zinc-500 italic mt-1">
                            Notes: {si.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-750 w-full max-w-md rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/80">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">Delete Stock In Record</h3>
                <p className="text-[11px] text-zinc-400">Reverse shipment voucher</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Invoice No:</span>
                <span className="font-mono font-bold text-emerald-400">#{deleteTarget.invoice_no}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Vendor:</span>
                <span className="text-zinc-200 font-medium">{deleteTarget.vendor}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Total Quantity:</span>
                <span className="font-mono text-zinc-200">{deleteTarget.total_qty} pcs</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-850">
                <span className="text-zinc-400">Total Cost:</span>
                <span className="font-mono font-bold text-zinc-200">
                  {formatCurrency(deleteTarget.total_cost ?? (deleteTarget as any).total_amount ?? 0)}
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete this stock-in record? Deleting this record will remove the intake voucher and adjust the inventory history accordingly.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
