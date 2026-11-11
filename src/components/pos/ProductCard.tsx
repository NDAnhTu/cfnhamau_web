'use client';

import React from 'react';
import Image from 'next/image';
import { Product } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import { Coffee, Layers, Plus, Minus } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  quantity?: number;
  onClick: (product: Product) => void;
  onIncrement?: (product: Product) => void;
  onDecrement?: (product: Product) => void;
  onOpenCustomizer?: (product: Product) => void;
}

export function ProductCard({
  product,
  quantity = 0,
  onClick,
  onIncrement,
  onDecrement,
  onOpenCustomizer,
}: ProductCardProps) {
  const isOutOfStock = !product.is_available;
  const isSelected = quantity > 0;

  return (
    <div
      onClick={() => !isOutOfStock && onClick(product)}
      className={`relative group bg-white dark:bg-slate-800 rounded-2xl p-2.5 sm:p-3 border transition-all flex flex-col justify-between select-none ${
        isOutOfStock
          ? 'opacity-60 cursor-not-allowed border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40'
          : isSelected
          ? 'cursor-pointer border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/30 dark:ring-amber-400/30 bg-amber-50/15 dark:bg-amber-950/15 shadow-md active:scale-[0.98]'
          : 'cursor-pointer border-slate-200 dark:border-slate-700/80 hover:border-amber-400 dark:hover:border-amber-500 hover:shadow-md active:scale-[0.98]'
      }`}
    >
      {/* Out of stock badge overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/60 rounded-2xl z-10 flex items-center justify-center backdrop-blur-[1px]">
          <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-full shadow-lg">
            Tạm hết hàng
          </span>
        </div>
      )}

      {/* Product Image / Placeholder */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700/50 mb-2 flex items-center justify-center">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <Coffee className="w-9 h-9 sm:w-10 sm:h-10 mb-1" />
            <span className="text-[10px] font-medium">Cà Phê</span>
          </div>
        )}

        {/* Selected Quantity Badge on Image */}
        {isSelected && (
          <div className="absolute top-2 left-2 z-10 bg-amber-600 dark:bg-amber-500 text-white text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5 animate-in zoom-in-75">
            <span>x{quantity}</span>
          </div>
        )}

        {/* Size Badge */}
        {product.has_sizes && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCustomizer) {
                onOpenCustomizer(product);
              } else {
                onClick(product);
              }
            }}
            title="Bấm để chọn size khác"
            className="absolute top-2 right-2 bg-amber-600/90 hover:bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm transition-transform active:scale-95"
          >
            <Layers className="w-2.5 h-2.5" />
            <span>Nhiều size</span>
          </button>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-xs sm:text-sm line-clamp-2 leading-snug">
            {product.name}
          </h3>
        </div>

        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between gap-1">
          <span className="font-extrabold text-amber-600 dark:text-amber-400 text-xs sm:text-sm truncate">
            {product.has_sizes
              ? `${formatCurrency(product.sizes?.[0]?.price || product.base_price)}`
              : formatCurrency(product.base_price)}
          </span>

          {/* Action: Stepper or Add button */}
          {isSelected ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/70 p-0.5 rounded-xl border border-amber-200 dark:border-amber-800/80 shrink-0 shadow-xs"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecrement?.(product);
                }}
                aria-label="Giảm số lượng"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/50 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all active:scale-90"
              >
                <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>

              <span className="min-w-[16px] sm:min-w-[20px] text-center font-black text-xs sm:text-sm text-amber-700 dark:text-amber-300 select-none">
                {quantity}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIncrement ? onIncrement(product) : onClick(product);
                }}
                aria-label="Tăng số lượng"
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center transition-all active:scale-90 shadow-xs"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onIncrement ? onIncrement(product) : onClick(product);
              }}
              aria-label="Thêm vào đơn"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 flex items-center justify-center hover:bg-amber-500 hover:text-white transition-all shrink-0 active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

