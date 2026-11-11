'use client';

import React, { useState } from 'react';
import { CartItem } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { DataService } from '@/lib/data-service';
import { X, Sparkles, Minus, Plus } from 'lucide-react';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem) => void;
  onRefreshMenu?: () => void;
}

export function CustomItemModal({
  isOpen,
  onClose,
  onAddToCart,
  onRefreshMenu,
}: CustomItemModalProps) {
  const [name, setName] = useState('');
  const [priceStr, setPriceStr] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saveToMenu, setSaveToMenu] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const price = Number(priceStr.replace(/[^0-9]/g, '')) || 0;
  const totalPrice = price * quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên món custom');
      return;
    }
    if (price <= 0) {
      alert('Vui lòng nhập đơn giá hợp lệ');
      return;
    }

    setSaving(true);
    let createdProductId: number | null = null;

    if (saveToMenu) {
      try {
        const saved = await DataService.saveProduct({
          name: name.trim(),
          has_sizes: false,
          base_price: price,
          is_available: true,
          is_active: true,
          is_quick_created: true,
        });
        createdProductId = saved.id;
        if (onRefreshMenu) onRefreshMenu();
      } catch (err) {
        console.error('Save quick item error:', err);
      }
    }

    const cartItem: CartItem = {
      tempId: `custom-${Date.now()}`,
      productId: createdProductId,
      name: name.trim(),
      price,
      quantity,
      notes: notes.trim() || undefined,
      isCustom: true,
    };

    onAddToCart(cartItem);
    setSaving(false);
    // Reset form
    setName('');
    setPriceStr('');
    setQuantity(1);
    setNotes('');
    setSaveToMenu(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Thêm Món Custom / Đặt Riêng
              </h2>
              <p className="text-xs text-slate-400">
                Tự set tên & giá bán trực tiếp tại quầy
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Tên Món *
            </label>
            <input
              type="text"
              required
              placeholder="VD: Nước cam tươi thêm mật ong..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Đơn Giá (VNĐ) *
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                required
                min={0}
                step={1000}
                placeholder="25000"
                value={priceStr}
                onChange={(e) => setPriceStr(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-base font-extrabold text-amber-600 dark:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400">
                VNĐ
              </span>
            </div>
          </div>

          {/* Quantity */}
          <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-slate-700/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Số lượng
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-6 text-center font-bold text-slate-900 dark:text-white">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Ghi chú pha chế
            </label>
            <input
              type="text"
              placeholder="VD: Không đá, ít ngọt..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Toggle save to menu */}
          <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                Lưu món này vào Menu quán
              </p>
              <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                Món sẽ xuất hiện trên danh mục chung cho các lần sau
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={saveToMenu}
                onChange={(e) => setSaveToMenu(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>

          {/* Footer Submit */}
          <button
            type="submit"
            disabled={saving || !name || price <= 0}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <span>Thêm vào giỏ</span>
            {price > 0 && (
              <>
                <span>•</span>
                <span>{formatCurrency(totalPrice)}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

