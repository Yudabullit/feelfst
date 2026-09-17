import React, { useState, useEffect } from 'react';
import {
  ReceiptText,
  Search,
  Calendar,
  Eye,
  Trash2,
  X,
  Printer,
  CreditCard,
  Building2,
} from 'lucide-react';
import { api } from '../services/api';
import { Sale, ProductWithStock } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const SalesHistory: React.FC = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sData, pData] = await Promise.all([api.getSales(), api.getProducts()]);
      setSales(sData);
      setProducts(pData);
    } catch (err: any) {
      toast.error('Failed to load sales register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDelete = async (id: string, invoice: string) => {
    if (!confirm(`Delete Sale #${invoice}? Stock will be returned to inventory.`)) return;
    try {
      await api.deleteSale(id);
      toast.success(`Sale #${invoice} deleted and stock restored.`);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete sale');
    }
  };

  const filteredSales = sales.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.invoice_no.toLowerCase().includes(q) ||
      s.customer_name?.toLowerCase().includes(q) ||
      s.payment_channel.toLowerCase().includes(q) ||
      s.payment_method.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
          Sales Register History
        </h2>
        <p className="text-xs text-zinc-400">
          Complete log of customer orders, invoices, payment channels and item breakdowns
        </p>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice #, customer name, channel..."
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>
            Total Transactions: <strong className="text-zinc-200">{filteredSales.length}</strong>
          </span>
          <span>&bull;</span>
          <span>
            Total Gross:{' '}
            <strong className="text-emerald-400 font-mono">
              {formatCurrency(filteredSales.reduce((sum, s) => sum + s.total_amount, 0))}
            </strong>
          </span>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Customer</th>
                <th className="py-3 px-3">Items Sold</th>
                <th className="py-3 px-3">Channel / Via</th>
                <th className="py-3 px-3">Method</th>
                <th className="py-3 px-3 text-right">Admin Fee</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    Loading sales transactions...
                  </td>
                </tr>
              ) : filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500">
                    No sales matching search query.
                  </td>
                </tr>
              ) : (
                filteredSales.map((s) => {
                  const totalUnits = s.items.reduce((sum, i) => sum + i.quantity, 0);

                  return (
                    <tr key={s.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        #{s.invoice_no}
                      </td>
                      <td className="py-3 px-3 text-zinc-300">{formatDate(s.date)}</td>
                      <td className="py-3 px-3 font-medium text-zinc-200">
                        {s.customer_name || 'General Customer'}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-300">
                        {totalUnits} pcs ({s.items.length} line items)
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px]">
                          {s.payment_channel}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{s.payment_method}</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-400">
                        {s.admin_fee > 0 ? formatCurrency(s.admin_fee) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-100">
                        {formatCurrency(s.total_amount)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedSale(s)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                            title="View Receipt"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(s.id, s.invoice_no)}
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800"
                              title="Delete & Reverse Inventory"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Receipt Detail Modal */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-750 text-zinc-100 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="font-mono text-emerald-400 font-bold">
                  #{selectedSale.invoice_no}
                </div>
                <div className="text-xs text-zinc-400">{formatDate(selectedSale.date)}</div>
              </div>
              <button
                onClick={() => setSelectedSale(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
              <div>
                <span className="text-zinc-500 block text-[10px]">Customer:</span>
                <span className="font-semibold text-zinc-200">{selectedSale.customer_name}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Cashier / Staff:</span>
                <span className="font-semibold text-zinc-200">{selectedSale.created_by}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Payment:</span>
                <span className="font-semibold text-zinc-200">{selectedSale.payment_method}</span>
              </div>
              <div>
                <span className="text-zinc-500 block text-[10px]">Channel:</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  {selectedSale.payment_channel}
                </span>
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              <div className="font-semibold text-zinc-300">Purchased Items:</div>
              {selectedSale.items.map((it, idx) => {
                const prod = products.find((p) => p.id === it.product_id);
                return (
                  <div
                    key={idx}
                    className="p-2.5 bg-zinc-950 border border-zinc-850 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {prod ? prod.design : 'Product'} ({it.size})
                      </div>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {it.quantity} &times; {formatCurrency(it.retail_price)}
                      </div>
                    </div>
                    <div className="font-mono font-bold text-zinc-100">
                      {formatCurrency(it.subtotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="pt-2 border-t border-zinc-800 space-y-1 text-right">
              {selectedSale.admin_fee > 0 && (
                <div className="flex justify-between text-zinc-400">
                  <span>Admin Fee:</span>
                  <span className="font-mono">{formatCurrency(selectedSale.admin_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm text-emerald-400 pt-1">
                <span>Total Amount:</span>
                <span className="font-mono">{formatCurrency(selectedSale.total_amount)}</span>
              </div>
            </div>

            {selectedSale.notes && (
              <div className="text-[11px] text-zinc-400 italic">
                Notes: {selectedSale.notes}
              </div>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice Receipt</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
