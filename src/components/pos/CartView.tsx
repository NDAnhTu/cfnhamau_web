'use client';

import React, { useState } from 'react';
import { CartItem, DiningTable, OrderType } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import {
  Trash2,
  Minus,
  Plus,
  ShoppingBag,
  CreditCard,
  Utensils,
  Clock,
  Sparkles,
  Percent,
} from 'lucide-react';

interface CartViewProps {
  cart: CartItem[];
  tables: DiningTable[];
  tableName: string;
  onChangeTableName: (name: string) => void;
  orderType: OrderType;
  discountAmount: number;
  onUpdateQuantity: (tempId: string, delta: number) => void;
  onRemoveItem: (tempId: string) => void;
  onClearCart: () => void;
  onSelectOrderType: (type: OrderType) => void;
  onSetDiscount: (amount: number) => void;
  onOpenPayment?: () => void;
  onSavePending: () => void;
  isSavingPending?: boolean;
  existingOrderId?: number | null;
}

export function CartView({
  cart,
  tables,
  tableName,
  onChangeTableName,
  orderType,
  discountAmount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onSelectOrderType,
  onSetDiscount,
  onOpenPayment,
  onSavePending,
  isSavingPending = false,
  existingOrderId,
}: CartViewProps) {
  const [showDiscountInput, setShowDiscountInput] = useState(false);
  const [discountVal, setDiscountVal] = useState(discountAmount.toString());

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const finalAmount = Math.max(0, subtotal - discountAmount);

  const applyDiscount = () => {
    const val = Number(discountVal.replace(/[^0-9]/g, '')) || 0;
    onSetDiscount(val);
    setShowDiscountInput(false);
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
              Giỏ Hàng Đang Chọn
            </h2>
            <p className="text-[11px] text-slate-400">
              {totalCount} ly / món đã chọn
            </p>
          </div>
        </div>

        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            title="Xóa toàn bộ giỏ"
            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dine-in vs Takeaway and Table Picker */}
      <div className="p-3 border-b border-slate-100 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-850">
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <button
            type="button"
            onClick={() => onSelectOrderType('dine_in')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              orderType === 'dine_in'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Tại bàn</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectOrderType('takeaway')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              orderType === 'takeaway'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Mang đi</span>
          </button>
        </div>

        {orderType === 'dine_in' && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Tên bàn / Khách:
              </span>
              <input
                type="text"
                value={tableName}
                onChange={(e) => onChangeTableName(e.target.value)}
                placeholder="VD: Bàn 03, Anh Nam quen..."
                className="flex-1 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        )}

        {existingOrderId && (
          <div className="mt-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px] font-bold flex items-center justify-between">
            <span>Đang bổ sung món cho đơn #{existingOrderId}</span>
            <span className="text-[10px] underline cursor-pointer" onClick={() => onClearCart()}>Hủy bổ sung</span>
          </div>
        )}
      </div>

      {/* Cart items list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {cart.length === 0 ? (
          <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 text-slate-300 dark:text-slate-600">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              Chưa có món nào trong giỏ
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Chạm vào thực đơn bên trái để thêm món
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.tempId}
              className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 flex flex-col gap-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                      {item.name}
                    </span>
                    {item.sizeName && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {item.sizeName}
                      </span>
                    )}
                    {item.isCustom && (
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                        Custom
                      </span>
                    )}
                  </div>
                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-1 mt-0.5">
                      Ghi chú: {item.notes}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => onRemoveItem(item.tempId)}
                  className="p-1 text-slate-300 hover:text-rose-500 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-slate-700/40">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                  {formatCurrency(item.price * item.quantity)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onUpdateQuantity(item.tempId, -1)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-xs text-slate-800 dark:text-white">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => onUpdateQuantity(item.tempId, 1)}
                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Actions */}
      <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-850 space-y-3">
        {/* Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500 dark:text-slate-400">
            <span>Tạm tính ({totalCount} món)</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {formatCurrency(subtotal)}
            </span>
          </div>

          {/* Discount toggle */}
          <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-medium text-[11px]"
            >
              <Percent className="w-3 h-3" />
              <span>{discountAmount > 0 ? 'Sửa giảm giá' : '+ Thêm giảm giá'}</span>
            </button>
            {discountAmount > 0 && (
              <span className="font-bold text-rose-500">
                - {formatCurrency(discountAmount)}
              </span>
            )}
          </div>

          {showDiscountInput && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                placeholder="Số tiền giảm (VNĐ)"
                value={discountVal}
                onChange={(e) => setDiscountVal(e.target.value)}
                className="flex-1 py-1 px-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
              />
              <button
                type="button"
                onClick={applyDiscount}
                className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold"
              >
                Áp dụng
              </button>
            </div>
          )}

          <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200 dark:border-slate-700 text-sm">
            <span className="font-bold text-slate-900 dark:text-white">Thực thu:</span>
            <span className="font-black text-lg text-amber-600 dark:text-amber-400">
              {formatCurrency(finalAmount)}
            </span>
          </div>
        </div>

        {/* Button */}
        <div>
          <button
            type="button"
            disabled={cart.length === 0 || isSavingPending}
            onClick={onSavePending}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-40 text-white font-extrabold text-sm shadow-md shadow-amber-600/30 transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>
              {isSavingPending
                ? 'Đang lưu...'
                : existingOrderId
                ? 'Cập Nhật Vào Bàn'
                : 'Lưu Bàn'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

