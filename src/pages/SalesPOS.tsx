import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Search,
  CreditCard,
  Building2,
  ScanBarcode,
  Printer,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, Sale, SizeKey, SIZES } from '../types';
import { formatCurrency, formatDate } from '../lib/format';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

interface CartItem {
  id: string;
  product: ProductWithStock;
  size: SizeKey;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface SalesPOSProps {
  initialPreselected?: { product: ProductWithStock; size: SizeKey } | null;
  onClearPreselected?: () => void;
  onViewHistory?: () => void;
}

export const SalesPOS: React.FC<SalesPOSProps> = ({
  initialPreselected,
  onClearPreselected,
  onViewHistory,
}) => {
  const toast = useToast();
  const { user } = useAuth();

  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<string[]>(['Shopee', 'BCA', 'Krisna', 'Tokopedia', 'Cash POS']);

  // POS State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');

  // Active product being configured
  const [activeProduct, setActiveProduct] = useState<ProductWithStock | null>(null);
  const [activeSize, setActiveSize] = useState<SizeKey>('M');
  const [activeQty, setActiveQty] = useState<number>(1);

  // Transaction Options
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer' | 'E-Commerce' | 'EDC' | 'Other'>('Cash');
  const [paymentChannel, setPaymentChannel] = useState('Cash POS');
  const [adminFee, setAdminFee] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Receipt Modal State
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const [prodData, settData] = await Promise.all([api.getProducts(), api.getSettings()]);
      setProducts(prodData);
      if (settData?.payment_channels?.length) {
        setChannels(settData.payment_channels);
        setPaymentChannel(settData.payment_channels[0]);
      }
      if (prodData.length > 0 && !activeProduct) {
        setActiveProduct(prodData[0]);
      }
    } catch (err: any) {
      toast.error('Failed to load POS catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Handle preselected product from Barcode Scanner
  useEffect(() => {
    if (initialPreselected) {
      setActiveProduct(initialPreselected.product);
      setActiveSize(initialPreselected.size);
      setActiveQty(1);
      // Automatically add to cart if stock is available
      const avail = initialPreselected.product.stock[initialPreselected.size] || 0;
      if (avail > 0) {
        addToCart(initialPreselected.product, initialPreselected.size, 1);
      } else {
        toast.error(`Size ${initialPreselected.size} is out of stock.`);
      }
      if (onClearPreselected) onClearPreselected();
    }
  }, [initialPreselected]);

  const addToCart = (product: ProductWithStock, size: SizeKey, qty: number) => {
    const available = product.stock[size] || 0;
    const existing = cart.find((i) => i.product.id === product.id && i.size === size);
    const existingQty = existing ? existing.quantity : 0;
    const needed = existingQty + qty;

    if (available <= 0) {
      toast.error(`Insufficient stock: ${product.design} size ${size} is OUT OF STOCK (0 pcs).`);
      return;
    }

    if (needed > available) {
      toast.error(
        `Insufficient stock: Requested ${needed} pcs, but only ${available} pcs available for size ${size}.`
      );
      return;
    }

    if (existing) {
      setCart((prev) =>
        prev.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                quantity: needed,
                subtotal: needed * item.unit_price,
              }
            : item
        )
      );
    } else {
      const newItem: CartItem = {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product,
        size,
        quantity: qty,
        unit_price: product.retail_price,
        subtotal: qty * product.retail_price,
      };
      setCart((prev) => [...prev, newItem]);
    }

    toast.success(`Added ${product.design} (${size}) to cart.`);
  };

  const updateCartQty = (itemId: string, delta: number) => {
    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      removeFromCart(itemId);
      return;
    }

    const available = item.product.stock[item.size] || 0;
    if (newQty > available) {
      toast.error(`Cannot exceed available stock (${available} pcs).`);
      return;
    }

    setCart((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? {
              ...i,
              quantity: newQty,
              subtotal: newQty * i.unit_price,
            }
          : i
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const itemsSubtotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
  const totalAmount = itemsSubtotal + Number(adminFee || 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Your POS cart is empty');
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = cart.map((i) => ({
        product_id: i.product.id,
        size: i.size,
        quantity: i.quantity,
        retail_price: i.unit_price,
      }));

      const sale = await api.createSale({
        date,
        customer_name: customerName.trim() || 'General Customer',
        items: itemsPayload,
        admin_fee: Number(adminFee) || 0,
        payment_method: paymentMethod,
        payment_channel: paymentChannel,
        notes: notes.trim(),
        created_by: user?.name || 'Staff',
      });

      setCompletedSale(sale);
      setIsReceiptOpen(true);
      toast.success(`Sale #${sale.invoice_no} completed!`);

      // Reset POS
      setCart([]);
      setAdminFee(0);
      setNotes('');

      // Refresh catalog stock
      await fetchCatalog();
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (selectedType !== 'ALL' && p.type !== selectedType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.code.toLowerCase().includes(q) ||
        p.design.toLowerCase().includes(q) ||
        p.colour.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const distinctTypes = Array.from(new Set(products.map((p) => p.type))).filter(Boolean);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] text-zinc-100">
            Point of Sale &amp; Sales Checkout
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time stock reservation with instant inventory deduction &amp; customer receipts
          </p>
        </div>

        {onViewHistory && (
          <button
            onClick={onViewHistory}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-semibold"
          >
            <Receipt className="w-4 h-4" />
            <span>View Sales Register</span>
          </button>
        )}
      </div>

      {/* POS Grid: Catalog on left, Cart & Checkout on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Catalog & Quick Add */}
        <div className="lg:col-span-7 space-y-4">
          {/* Catalog Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search design, colour, code..."
                className="w-full bg-zinc-950 border border-zinc-750 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-zinc-950 border border-zinc-750 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Categories</option>
              {distinctTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Active Product Quick Selector Card */}
          {activeProduct && (
            <div className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-750 rounded-2xl space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div>
                  <div className="font-mono text-xs text-emerald-400 font-bold">
                    {activeProduct.code} &bull; {activeProduct.type}
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">
                    {activeProduct.design} &mdash; {activeProduct.colour}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold font-mono text-zinc-100">
                    {formatCurrency(activeProduct.retail_price)}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Total In Stock: {activeProduct.total_stock} pcs
                  </div>
                </div>
              </div>

              {/* Sizes Selection with Live Stock Validation (Section 8) */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">
                  Select Size (Check Available Stock):
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((size) => {
                    const available = activeProduct.stock[size] || 0;
                    const isSelected = activeSize === size;
                    const inStock = available > 0;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => {
                          setActiveSize(size);
                          setActiveQty(1);
                        }}
                        disabled={!inStock}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          !inStock
                            ? 'opacity-30 border-zinc-800 bg-zinc-900 cursor-not-allowed text-zinc-500'
                            : isSelected
                            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500/50 shadow-sm'
                            : 'border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{size}</div>
                        <div className="text-[10px] font-mono mt-0.5">
                          {inStock ? `${available} left` : 'Sold Out'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity & Add to Cart */}
              <div className="flex items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-zinc-400">Qty:</span>
                  <div className="flex items-center border border-zinc-750 bg-zinc-950 rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setActiveQty((q) => Math.max(1, q - 1))}
                      className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-4 text-xs font-mono font-bold text-zinc-100">
                      {activeQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const avail = activeProduct.stock[activeSize] || 0;
                        if (activeQty < avail) {
                          setActiveQty((q) => q + 1);
                        } else {
                          toast.error(`Cannot exceed available stock (${avail} pcs).`);
                        }
                      }}
                      className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addToCart(activeProduct, activeSize, activeQty)}
                  disabled={(activeProduct.stock[activeSize] || 0) <= 0}
                  className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add to Cart ({formatCurrency(activeProduct.retail_price * activeQty)})</span>
                </button>
              </div>
            </div>
          )}

          {/* Catalog Product Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-1">
            {filteredProducts.map((p) => {
              const isSelected = activeProduct?.id === p.id;
              const isOutOfStock = p.total_stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => setActiveProduct(p)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-850 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="font-mono text-[10px] text-zinc-400 truncate">{p.code}</div>
                  <div className="font-bold text-xs text-zinc-100 mt-1 truncate">{p.design}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{p.colour}</div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-zinc-800/80">
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {formatCurrency(p.retail_price)}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isOutOfStock
                          ? 'bg-rose-950 text-rose-400'
                          : p.total_stock <= 5
                          ? 'bg-amber-950 text-amber-300'
                          : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {p.total_stock} pcs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: POS Cart & Checkout Panel */}
        <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-zinc-100">Sale Cart</h3>
              </div>
              <span className="text-xs font-mono font-bold text-zinc-300">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-zinc-500 text-xs space-y-2 border border-dashed border-zinc-800 rounded-xl">
                <ShoppingCart className="w-8 h-8 mx-auto text-zinc-600" />
                <p>No items in cart. Select a product to add.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-zinc-200 truncate">{item.product.design}</div>
                      <div className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                        <span className="font-bold font-mono text-emerald-400">{item.size}</span>
                        <span>&bull;</span>
                        <span className="font-mono">{formatCurrency(item.unit_price)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-zinc-800 bg-zinc-900 rounded-lg overflow-hidden">
                        <button
                          onClick={() => updateCartQty(item.id, -1)}
                          className="p-1 text-zinc-400 hover:text-zinc-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2 font-mono font-bold text-zinc-200">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateCartQty(item.id, 1)}
                          className="p-1 text-zinc-400 hover:text-zinc-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[70px]">
                        <div className="font-bold font-mono text-zinc-100">
                          {formatCurrency(item.subtotal)}
                        </div>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1 text-zinc-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sale Checkout Fields */}
            <div className="pt-2 border-t border-zinc-800 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Customer
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Walk-in Customer"
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Transfer">Transfer</option>
                    <option value="E-Commerce">E-Commerce</option>
                    <option value="EDC">EDC Card</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Via / Channel
                  </label>
                  <select
                    value={paymentChannel}
                    onChange={(e) => setPaymentChannel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  >
                    {channels.map((chan) => (
                      <option key={chan} value={chan}>
                        {chan}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">
                    Admin Fee / Shipping (Optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={adminFee}
                    onChange={(e) => setAdminFee(Math.max(0, Number(e.target.value)))}
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Notes</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Order #Shopee"
                    className="w-full bg-zinc-950 border border-zinc-750 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Summary & Checkout Button */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Items Subtotal:</span>
              <span className="font-mono text-zinc-200">{formatCurrency(itemsSubtotal)}</span>
            </div>
            {adminFee > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Admin Fee / Surcharge:</span>
                <span className="font-mono text-zinc-200">{formatCurrency(adminFee)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-zinc-800 font-bold text-sm">
              <span className="text-zinc-200">Total Amount:</span>
              <span className="font-mono text-emerald-400 text-base">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            <button
              type="button"
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting}
              className="w-full mt-3 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing Transaction...' : 'Complete & Print Receipt'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOMER RECEIPT MODAL */}
      {isReceiptOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 font-mono text-xs">
            <div className="text-center border-b border-dashed border-zinc-300 pb-3">
              <div className="font-black text-lg tracking-widest">FEELFST</div>
              <div className="text-[10px] text-zinc-500">Surf &amp; Clothing Hub</div>
              <div className="text-[10px] text-zinc-400 mt-1">Invoice: #{completedSale.invoice_no}</div>
              <div className="text-[10px] text-zinc-400">{formatDate(completedSale.date)}</div>
            </div>

            <div className="space-y-1 text-[11px] border-b border-dashed border-zinc-300 pb-3">
              <div className="flex justify-between">
                <span className="text-zinc-500">Customer:</span>
                <span className="font-bold">{completedSale.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Cashier:</span>
                <span>{completedSale.created_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Payment:</span>
                <span>
                  {completedSale.payment_method} ({completedSale.payment_channel})
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 border-b border-dashed border-zinc-300 pb-3">
              {completedSale.items.map((item, idx) => {
                const prod = products.find((p) => p.id === item.product_id);
                return (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{prod ? prod.design : 'Garment'}</div>
                      <div className="text-[10px] text-zinc-500">
                        Size: {item.size} &bull; {item.quantity} &times; {formatCurrency(item.retail_price)}
                      </div>
                    </div>
                    <div className="font-bold">{formatCurrency(item.subtotal)}</div>
                  </div>
                );
              })}
            </div>

            {/* Receipt Totals */}
            <div className="space-y-1 text-right">
              {completedSale.admin_fee > 0 && (
                <div className="flex justify-between text-zinc-500">
                  <span>Admin Fee:</span>
                  <span>{formatCurrency(completedSale.admin_fee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-sm pt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(completedSale.total_amount)}</span>
              </div>
            </div>

            <div className="text-center text-[10px] text-zinc-400 pt-2 border-t border-dashed border-zinc-300">
              Thank you for shopping at FEELFST!
              <br />
              All purchases are registered in cloud inventory.
            </div>

            <div className="flex gap-2 pt-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 bg-zinc-900 text-white rounded-xl font-sans font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
              <button
                type="button"
                onClick={() => setIsReceiptOpen(false)}
                className="flex-1 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl font-sans font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
