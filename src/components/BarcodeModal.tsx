import React, { useState, useEffect, useRef } from 'react';
import { ScanBarcode, X, Check, ArrowRight, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { ProductWithStock, SizeKey, SIZES } from '../types';
import { formatCurrency } from '../lib/format';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProductForPOS?: (product: ProductWithStock, size: SizeKey) => void;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  onSelectProductForPOS,
}) => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [matchedProduct, setMatchedProduct] = useState<ProductWithStock | null>(null);
  const [selectedSize, setSelectedSize] = useState<SizeKey>('M');
  const [allProducts, setAllProducts] = useState<ProductWithStock[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      api.getProducts().then(setAllProducts).catch(console.error);
      setBarcodeInput('');
      setMatchedProduct(null);
      setErrorMessage('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleLookup = (codeToSearch: string) => {
    const code = codeToSearch.trim().toUpperCase();
    if (!code) return;

    setIsSearching(true);
    setErrorMessage('');

    const found = allProducts.find((p) => p.code.toUpperCase() === code);
    if (found) {
      setMatchedProduct(found);
      // Auto-select first size with available stock
      const firstAvailable = SIZES.find((s) => (found.stock[s] || 0) > 0) || 'M';
      setSelectedSize(firstAvailable);
    } else {
      setMatchedProduct(null);
      setErrorMessage(`No product found with barcode/code: "${code}"`);
    }
    setIsSearching(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLookup(barcodeInput);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-zinc-100">
        <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-100">
              <ScanBarcode className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-100">Barcode Scanner Terminal</h3>
              <p className="text-xs text-zinc-400">Scan or enter product SKU code</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Scanner Input */}
          <form onSubmit={handleSubmit} className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Enter / Scan Product Barcode
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. FLTS-0001-BLK"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 font-mono text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm rounded-xl transition-colors"
              >
                Scan
              </button>
            </div>
          </form>

          {/* Quick Demo Code Tags */}
          <div>
            <div className="text-[11px] text-zinc-400 mb-1.5">Quick barcode presets from inventory:</div>
            <div className="flex flex-wrap gap-1.5">
              {allProducts.slice(0, 4).map((p) => (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => {
                    setBarcodeInput(p.code);
                    handleLookup(p.code);
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md border border-zinc-700 transition-colors"
                >
                  {p.code}
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Product Result Card */}
          {matchedProduct && (
            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-xs text-emerald-400 font-semibold">
                    {matchedProduct.code}
                  </div>
                  <h4 className="text-base font-bold text-zinc-100">{matchedProduct.design}</h4>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {matchedProduct.colour} &bull; {matchedProduct.type}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-zinc-100">
                    {formatCurrency(matchedProduct.retail_price)}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Total in Stock:{' '}
                    <span
                      className={`font-bold ${
                        matchedProduct.total_stock > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {matchedProduct.total_stock} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Sizes Available */}
              <div>
                <div className="text-xs font-semibold text-zinc-400 mb-2">Available Stock by Size:</div>
                <div className="grid grid-cols-5 gap-2">
                  {SIZES.map((size) => {
                    const qty = matchedProduct.stock[size] || 0;
                    const isSelected = selectedSize === size;
                    const hasStock = qty > 0;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => hasStock && setSelectedSize(size)}
                        disabled={!hasStock}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          !hasStock
                            ? 'opacity-30 border-zinc-800 bg-zinc-900 cursor-not-allowed text-zinc-500'
                            : isSelected
                            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200 ring-1 ring-emerald-500'
                            : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-xs font-bold">{size}</div>
                        <div className="text-[11px] font-mono mt-0.5">{qty} pcs</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Button */}
              {onSelectProductForPOS && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectProductForPOS(matchedProduct, selectedSize);
                    onClose();
                  }}
                  disabled={(matchedProduct.stock[selectedSize] || 0) <= 0}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <span>Add Size {selectedSize} to POS Cart</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
