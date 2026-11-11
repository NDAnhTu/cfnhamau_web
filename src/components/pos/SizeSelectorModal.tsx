'use client';

import React, { useState, useEffect } from 'react';
import { Product, ProductSize, CartItem } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { X, Minus, Plus, Check } from 'lucide-react';

interface SizeSelectorModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
}

const QUICK_TAGS = [
  'Ít đá',
  'Không đá',
  'Đá riêng',
  'Ít ngọt',
  'Không đường',
  'Nhiều sữa',
  'Mang đi',
  'Uống tại quán',
];

export function SizeSelectorModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: SizeSelectorModalProps) {
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState('');

  useEffect(() => {
    if (product && product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    } else {
      setSelectedSize(null);
    }
    setQuantity(1);
    setSelectedTags([]);
    setCustomNote('');
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const currentPrice = selectedSize ? selectedSize.price : product.base_price;
  const totalPrice = currentPrice * quantity;

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleConfirm = () => {
    const combinedNotes = [
      ...selectedTags,
      customNote.trim(),
    ]
      .filter(Boolean)
      .join(', ');

    const cartItem: CartItem = {
      tempId: `${product.id}-${selectedSize?.id || 'base'}-${Date.now()}`,
      productId: product.id,
      sizeId: selectedSize?.id || null,
      name: product.name,
      sizeName: selectedSize?.size_name || null,
      price: currentPrice,
      quantity,
      notes: combinedNotes,
      isCustom: false,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-12 h-12 rounded-xl object-cover"
              />
            )}
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {product.name}
              </h2>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                Đơn giá: {formatCurrency(currentPrice)}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body scrollable */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Size Selector */}
          {product.has_sizes && product.sizes && product.sizes.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                Chọn Kích Thước (Size)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {product.sizes.map((size) => {
                  const isSelected = selectedSize?.id === size.id;
                  return (
                    <button
                      key={size.id}
                      type="button"
                      disabled={!size.is_available}
                      onClick={() => setSelectedSize(size)}
                      className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between ${
                        !size.is_available
                          ? 'opacity-40 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200'
                          : isSelected
                          ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm ring-1 ring-amber-500'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-sm text-slate-800 dark:text-white">
                          {size.size_name}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-amber-600 text-white flex items-center justify-center">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        {formatCurrency(size.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick tags */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
              Ghi chú nhanh (Pha chế)
            </label>
            <div className="flex flex-wrap gap-2">
              {QUICK_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleToggleTag(tag)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Note Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Yêu cầu đặc biệt khác
            </label>
            <input
              type="text"
              placeholder="VD: Không lấy ống hút, thêm ly đá riêng..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Quantity Stepper */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/50">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Số lượng
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-extrabold text-base text-slate-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer with sticky action button */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-850">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <span>Thêm vào đơn</span>
            <span>•</span>
            <span className="tracking-wide">{formatCurrency(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

