import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  History,
  AlertCircle,
  Package,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, Product, StockMovementRecord, SizeKey, SIZES } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export const MasterData: React.FC = () => {
  const { isAdmin, isStaff, user } = useAuth();
  const canManage = isAdmin || isStaff || Boolean(user);
  const toast = useToast();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStock | null>(null);
  const [productHistory, setProductHistory] = useState<StockMovementRecord[]>([]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Form Modal (Add / Edit)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [formId, setFormId] = useState('');
  const [formData, setFormData] = useState({
    design: '',
    colour: '',
    code: '',
    type: 'T-Shirt',
    cost_price: 90000,
    retail_price: 150000,
  });

  // Delete Confirmation Modal
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteProductInfo, setDeleteProductInfo] = useState<ProductWithStock | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        search: searchQuery,
        type: selectedType,
        status: selectedStatus,
      });
      setProducts(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedType, selectedStatus]);

  const openDetail = async (prod: ProductWithStock) => {
    setSelectedProduct(prod);
    setIsDetailOpen(true);
    setLoadingDetail(true);
    try {
      const res = await api.getProduct(prod.id);
      setSelectedProduct(res.product);
      setProductHistory(res.history);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch product movement history');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openAddModal = () => {
    setFormMode('add');
    setFormId('');
    setFormData({
      design: '',
      colour: '',
      code: '',
      type: 'T-Shirt',
      cost_price: 90000,
      retail_price: 150000,
    });
    setIsFormOpen(true);
  };

  const openEditModal = (prod: ProductWithStock) => {
    setFormMode('edit');
    setFormId(prod.id);
    setFormData({
      design: prod.design,
      colour: prod.colour,
      code: prod.code,
      type: prod.type,
      cost_price: prod.cost_price,
      retail_price: prod.retail_price,
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formMode === 'add') {
        await api.createProduct(formData);
        toast.success(`Product ${formData.code} created successfully.`);
      } else {
        await api.updateProduct(formId, formData);
        toast.success(`Product ${formData.code} updated.`);
      }
      setIsFormOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Error saving product');
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteProduct(deleteId);
      toast.success(res?.message || 'Product removed successfully.');
      setDeleteId(null);
      setDeleteProductInfo(null);
      if (selectedProduct && selectedProduct.id === deleteId) {
        setIsDetailOpen(false);
        setSelectedProduct(null);
      }
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || 'Could not delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const distinctTypes = Array.from(new Set(products.map((p) => p.type))).filter(Boolean);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
            Master Data Inventory
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time multi-size stock computed dynamically from transaction movements
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm shadow-md transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
        {/* Search */}
        <div className="sm:col-span-6 relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by code (FLTS-0001-BLK), design, colour, type..."
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filter Type */}
        <div className="sm:col-span-3">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Garment Types</option>
            {distinctTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Stock Availability */}
        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Stock Statuses</option>
            <option value="in_stock">In Stock (&gt; 5)</option>
            <option value="low_stock">Low Stock (1–5)</option>
            <option value="out_of_stock">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-950/80 border-b border-zinc-800 text-zinc-400 uppercase font-semibold">
                <th className="py-3.5 px-4">Design</th>
                <th className="py-3.5 px-3">Colour</th>
                <th className="py-3.5 px-3">SKU Code</th>
                <th className="py-3.5 px-3">Type</th>
                {SIZES.map((s) => (
                  <th key={s} className="py-3.5 px-2 text-center">
                    {s}
                  </th>
                ))}
                <th className="py-3.5 px-3 text-right">Cost</th>
                <th className="py-3.5 px-3 text-right">Retail</th>
                <th className="py-3.5 px-3 text-center">Total Stock</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-zinc-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-zinc-500">
                    No products found matching filters.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-850/40 transition-colors group">
                    <td className="py-3 px-4 font-bold text-zinc-200">{p.design}</td>
                    <td className="py-3 px-3 text-zinc-300">{p.colour}</td>
                    <td className="py-3 px-3 font-mono text-emerald-400 font-semibold">{p.code}</td>
                    <td className="py-3 px-3 text-zinc-400">{p.type}</td>
                    {SIZES.map((size) => {
                      const qty = p.stock[size] || 0;
                      return (
                        <td key={size} className="py-3 px-2 text-center font-mono font-medium">
                          <span
                            className={
                              qty === 0
                                ? 'text-zinc-600'
                                : qty <= 2
                                ? 'text-amber-400 font-bold'
                                : 'text-zinc-200'
                            }
                          >
                            {qty}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-right font-mono text-zinc-400">
                      {formatCurrency(p.cost_price)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-zinc-100 font-semibold">
                      {formatCurrency(p.retail_price)}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs ${
                          p.total_stock === 0
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : p.total_stock <= 5
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-zinc-800 text-zinc-100'
                        }`}
                      >
                        {p.total_stock}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                          p.status === 'out_of_stock'
                            ? 'text-rose-400 bg-rose-950/40'
                            : p.status === 'low_stock'
                            ? 'text-amber-300 bg-amber-950/40'
                            : 'text-emerald-400 bg-emerald-950/40'
                        }`}
                      >
                        {p.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(p)}
                          title="View Details & Movement History"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {canManage && (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Product"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteId(p.id);
                                setDeleteProductInfo(p);
                              }}
                              title="Delete Product"
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT DETAIL DRAWER / MODAL (Section 5) */}
      {isDetailOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-3xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden text-zinc-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  {selectedProduct.code}
                </span>
                <h3 className="text-lg font-bold font-['Space_Grotesk'] text-zinc-100">
                  {selectedProduct.design} &mdash; {selectedProduct.colour}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const prod = selectedProduct;
                        setIsDetailOpen(false);
                        openEditModal(prod);
                      }}
                      title="Edit Product"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteId(selectedProduct.id);
                        setDeleteProductInfo(selectedProduct);
                      }}
                      title="Delete Product"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </>
                )}
                <button
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Product Information Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Garment Type</div>
                  <div className="text-sm font-semibold text-zinc-200 mt-0.5">
                    {selectedProduct.type}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Harga Pokok (Cost)</div>
                  <div className="text-sm font-semibold font-mono text-zinc-300 mt-0.5">
                    {formatCurrency(selectedProduct.cost_price)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Harga Retail</div>
                  <div className="text-sm font-semibold font-mono text-emerald-400 mt-0.5">
                    {formatCurrency(selectedProduct.retail_price)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400">Total Stock Available</div>
                  <div className="text-sm font-bold font-mono text-zinc-100 mt-0.5">
                    {selectedProduct.total_stock} pcs
                  </div>
                </div>
              </div>

              {/* CURRENT STOCK BY SIZE */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2.5">
                  Current Stock by Size SKU
                </h4>
                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((size) => {
                    const qty = selectedProduct.stock[size] || 0;
                    return (
                      <div
                        key={size}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-850 text-center"
                      >
                        <div className="text-xs font-bold text-zinc-300">{size}</div>
                        <div className="text-lg font-bold font-mono text-zinc-100 mt-1">{qty}</div>
                        <div className="text-[10px] text-zinc-500">pcs</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* STOCK MOVEMENT HISTORY (Section 5) */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <History className="w-4 h-4 text-emerald-400" />
                    <span>Stock Movement History</span>
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    {productHistory.length} audit entries
                  </span>
                </div>

                {loadingDetail ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">Loading ledger...</div>
                ) : productHistory.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs bg-zinc-950 rounded-xl border border-zinc-800">
                    No transactions recorded for this product yet.
                  </div>
                ) : (
                  <div className="border border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 uppercase font-semibold">
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">Type</th>
                          <th className="py-2.5 px-3">Reference</th>
                          <th className="py-2.5 px-2 text-center">Size</th>
                          <th className="py-2.5 px-3 text-right">Quantity</th>
                          <th className="py-2.5 px-3">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {productHistory.map((mov) => (
                          <tr key={mov.id} className="hover:bg-zinc-850/40">
                            <td className="py-2.5 px-3 text-zinc-300">{formatDate(mov.date)}</td>
                            <td className="py-2.5 px-3 font-semibold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  mov.transaction_type === 'Stock In'
                                    ? 'bg-emerald-950 text-emerald-400'
                                    : mov.transaction_type === 'Sale'
                                    ? 'bg-blue-950 text-blue-400'
                                    : mov.transaction_type === 'Stock Out'
                                    ? 'bg-amber-950 text-amber-300'
                                    : 'bg-purple-950 text-purple-300'
                                }`}
                              >
                                {mov.transaction_type}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-300">{mov.reference}</td>
                            <td className="py-2.5 px-2 text-center font-bold font-mono text-zinc-200">
                              {mov.size}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              <span
                                className={
                                  mov.direction === '+' ? 'text-emerald-400' : 'text-rose-400'
                                }
                              >
                                {mov.direction}
                                {mov.quantity}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-zinc-400 text-[11px] max-w-xs truncate">
                              {mov.notes}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT PRODUCT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold font-['Space_Grotesk'] text-zinc-100">
                {formMode === 'add' ? 'Add Master Product' : 'Edit Master Product'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">
                  Product SKU Code (Unique Identifier)
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FLTS-0001-BLK"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Design Name</label>
                  <input
                    type="text"
                    required
                    value={formData.design}
                    onChange={(e) =>
                      setFormData({ ...formData, design: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. MOUTH SQUASH"
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">Colour</label>
                  <input
                    type="text"
                    required
                    value={formData.colour}
                    onChange={(e) =>
                      setFormData({ ...formData, colour: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. BLACK"
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-1">Type / Category</label>
                <input
                  type="text"
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="e.g. T-Shirt, Hoodie, Boardshorts"
                  className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">
                    Harga Pokok (Cost)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.cost_price}
                    onChange={(e) =>
                      setFormData({ ...formData, cost_price: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-400 block mb-1">
                    Harga Retail (Selling)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={formData.retail_price}
                    onChange={(e) =>
                      setFormData({ ...formData, retail_price: Number(e.target.value) })
                    }
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-3.5 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl shadow-sm transition-colors"
                >
                  {formMode === 'add' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteId && deleteProductInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-750 w-full max-w-md rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/80">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">Delete Product</h3>
                <p className="text-[11px] text-zinc-400">Permanently remove from Master Data</p>
              </div>
            </div>

            <div className="p-3.5 bg-zinc-950/90 border border-zinc-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">SKU Code:</span>
                <span className="font-mono font-bold text-emerald-400">{deleteProductInfo.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Design & Colour:</span>
                <span className="font-medium text-zinc-200">
                  {deleteProductInfo.design} &mdash; {deleteProductInfo.colour}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Category / Type:</span>
                <span className="text-zinc-300">{deleteProductInfo.type}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-zinc-850">
                <span className="text-zinc-400">Current Stock:</span>
                <span className="font-mono font-bold text-zinc-200">
                  {deleteProductInfo.total_stock} pcs
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Are you sure you want to delete this product? This action will permanently remove it from your inventory master list and clean up all associated stock records.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800/80">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => {
                  setDeleteId(null);
                  setDeleteProductInfo(null);
                }}
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
                <span>{isDeleting ? 'Deleting Product...' : 'Yes, Delete Product'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
