'use client';

import React, { useState, useEffect } from 'react';
import { PaymentMethod, DiningTable, Order, OrderItem } from '@/types/database';
import { formatCurrency } from '@/lib/utils';
import {
  X,
  Banknote,
  QrCode,
  CheckCircle2,
  Receipt,
  ArrowRight,
  Sparkles,
  Layers,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  table: DiningTable | null;
  orderType: 'dine_in' | 'takeaway';
  orderNumber: string;
  order?: Order | null;
  onCompleteOrder: (paymentMethod: PaymentMethod, notes?: string) => Promise<void>;
  onSplitAndPayOrder?: (
    selectedItems: { itemId: number; quantity: number; itemName?: string; unitPrice?: number }[],
    paymentMethod: PaymentMethod,
    notes?: string
  ) => Promise<void>;
  canDelete?: boolean;
  onDeleteOrder?: () => Promise<void> | void;
}

const TENDER_PRESETS = [50000, 100000, 200000, 500000];

export function PaymentModal({
  isOpen,
  onClose,
  totalAmount,
  discountAmount,
  finalAmount,
  table,
  orderType,
  orderNumber,
  order,
  onCompleteOrder,
  onSplitAndPayOrder,
  canDelete = false,
  onDeleteOrder,
}: PaymentModalProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [customerCashStr, setCustomerCashStr] = useState<string>('');
  const [orderNotes, setOrderNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  // Split payment state
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<{ [itemId: number]: number }>({});

  const orderItems = order?.items || [];
  const totalItemCount = orderItems.reduce((acc, i) => acc + i.quantity, 0);
  const canSplit = Boolean(
    onSplitAndPayOrder && order && (orderItems.length >= 2 || totalItemCount >= 2)
  );

  // Reset or initialize state when modal opens or order changes
  useEffect(() => {
    if (isOpen) {
      setIsSplitMode(false);
      setCustomerCashStr('');
      setOrderNotes('');
      setProcessing(false);
      setSelectedItemQuantities({});
    }
  }, [isOpen, orderNumber]);

  if (!isOpen) return null;

  // Selected items calculation in split mode
  const selectedSplitList = orderItems
    .filter((item) => (selectedItemQuantities[item.id] || 0) > 0)
    .map((item) => ({
      itemId: item.id,
      item,
      quantity: selectedItemQuantities[item.id] || 0,
      subtotal: (selectedItemQuantities[item.id] || 0) * item.unit_price,
    }));

  // Remaining items that stay at the table
  const remainingSplitList = orderItems
    .map((item) => {
      const paidQty = selectedItemQuantities[item.id] || 0;
      const remainQty = Math.max(0, item.quantity - paidQty);
      return {
        itemId: item.id,
        item,
        quantity: remainQty,
        subtotal: remainQty * item.unit_price,
      };
    })
    .filter((i) => i.quantity > 0);

  const splitTotalAmount = selectedSplitList.reduce((acc, i) => acc + i.subtotal, 0);
  const remainingTotalAmount = remainingSplitList.reduce((acc, i) => acc + i.subtotal, 0);
  const effectiveFinalAmount = isSplitMode ? splitTotalAmount : finalAmount;
  const isAllItemsSelected =
    orderItems.length > 0 &&
    orderItems.every((item) => (selectedItemQuantities[item.id] || 0) === item.quantity);

  const customerCash = Number(customerCashStr.replace(/[^0-9]/g, '')) || 0;
  const changeDue = Math.max(0, customerCash - effectiveFinalAmount);

  const handleToggleItem = (item: OrderItem, checked: boolean) => {
    setSelectedItemQuantities((prev) => {
      const next = { ...prev };
      if (checked) {
        next[item.id] = 1; // Mặc định là 1 món lẻ
      } else {
        delete next[item.id];
      }
      return next;
    });
  };

  const handleUpdateItemQty = (itemId: number, newQty: number, maxQty: number) => {
    const clamped = Math.max(0, Math.min(newQty, maxQty));
    setSelectedItemQuantities((prev) => {
      const next = { ...prev };
      if (clamped <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = clamped;
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all: { [id: number]: number } = {};
    orderItems.forEach((i) => {
      all[i.id] = i.quantity;
    });
    setSelectedItemQuantities(all);
  };

  const handleDeselectAll = () => {
    setSelectedItemQuantities({});
  };

  const handleSetExactCash = () => {
    setCustomerCashStr(effectiveFinalAmount.toString());
  };

  const handleSelectPreset = (amount: number) => {
    setCustomerCashStr(amount.toString());
  };

  const handleFinish = async () => {
    if (isSplitMode && selectedSplitList.length === 0) {
      alert('Vui lòng chọn ít nhất 1 món để thanh toán lẻ!');
      return;
    }

    setProcessing(true);
    try {
      if (isSplitMode && onSplitAndPayOrder && !isAllItemsSelected) {
        // Partial split payment
        await onSplitAndPayOrder(
          selectedSplitList.map((s) => ({
            itemId: s.itemId,
            quantity: s.quantity,
            itemName: s.item.item_name,
            unitPrice: s.item.unit_price,
          })),
          method,
          orderNotes
        );
      } else {
        // Full order payment
        await onCompleteOrder(method, orderNotes);
      }
      onClose();
    } catch (err: any) {
      alert('Lỗi thanh toán: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const qrUrl = '/qr-code.jpg';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Thanh Toán Đơn {orderNumber}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {orderType === 'dine_in' ? order?.table_name || table?.name || 'Tại bàn' : 'Mang về'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Chọn phương thức & xác nhận hóa đơn</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Split Option Switcher if order has 2+ items */}
        {canSplit && (
          <div className="p-2 sm:px-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-800">
            <div className="flex rounded-2xl bg-slate-200/80 dark:bg-slate-750 p-1">
              <button
                type="button"
                onClick={() => setIsSplitMode(false)}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  !isSplitMode
                    ? 'bg-white dark:bg-slate-850 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Thanh toán tất cả
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSplitMode(true);
                  setSelectedItemQuantities({});
                }}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  isSplitMode
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>Thanh toán lẻ từng món</span>
              </button>
            </div>
          </div>
        )}

        {/* Split Mode Dual Preview & Item Selector */}
        {isSplitMode && (
          <div className="p-3 sm:p-4 border-b border-amber-200/50 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
            {/* Checklist items to choose */}
            <div className="pt-1 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
                <span className="text-amber-700 dark:text-amber-400">Tick chọn món khách muốn thanh toán:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold"
                  >
                    Chọn tất cả
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="text-[11px] text-slate-500 hover:underline font-bold"
                  >
                    Bỏ chọn hết
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {orderItems.map((item) => {
                  const qty = selectedItemQuantities[item.id] || 0;
                  const isChecked = qty > 0;
                  return (
                    <div
                      key={item.id}
                      className={`p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2 ${
                        isChecked
                          ? 'bg-white dark:bg-slate-800 border-emerald-500 ring-1 ring-emerald-500/30 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-850/60 border-slate-200 dark:border-slate-700/60 opacity-60'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 flex-1 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => handleToggleItem(item, e.target.checked)}
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <div className="leading-tight">
                          <span className="font-bold text-xs text-slate-900 dark:text-white block">
                            {item.item_name} {item.size_name && `(${item.size_name})`}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Có tổng {item.quantity} ly • {formatCurrency(item.unit_price)} / ly
                          </span>
                        </div>
                      </label>

                      {/* Stepper for quantity */}
                      {isChecked && (
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5 border border-slate-200 dark:border-slate-600">
                          <button
                            type="button"
                            disabled={qty <= 1}
                            onClick={() => handleUpdateItemQty(item.id, qty - 1, item.quantity)}
                            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black px-1.5 min-w-[20px] text-center text-slate-900 dark:text-white">
                            {qty}
                          </span>
                          <button
                            type="button"
                            disabled={qty >= item.quantity}
                            onClick={() => handleUpdateItemQty(item.id, qty + 1, item.quantity)}
                            className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap min-w-[70px] text-right">
                        {formatCurrency(item.unit_price * (isChecked ? qty : 0))}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Amount Banner */}
        <div className="p-4 bg-amber-500/10 dark:bg-amber-500/5 border-b border-amber-200/50 dark:border-amber-900/30 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              {isSplitMode
                ? `Số tiền thanh toán lẻ (${selectedSplitList.length} món)`
                : 'Số tiền thực thu'}
            </span>
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
              {formatCurrency(effectiveFinalAmount)}
            </span>
          </div>
          {!isSplitMode && discountAmount > 0 && (
            <div className="text-right">
              <span className="text-[11px] text-slate-400 line-through block">
                Gốc: {formatCurrency(totalAmount)}
              </span>
              <span className="text-xs font-bold text-rose-500">
                - {formatCurrency(discountAmount)}
              </span>
            </div>
          )}
          {isSplitMode && (
            <div className="text-right">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                Tách lẻ bàn {order?.table_name || table?.name}
              </span>
            </div>
          )}
        </div>

        {/* Method Switcher Tabs */}
        <div className="grid grid-cols-2 p-3 gap-2 border-b border-slate-100 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setMethod('cash')}
            className={`py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              method === 'cash'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <Banknote className="w-4 h-4" />
            <span>Tiền Mặt</span>
          </button>

          <button
            type="button"
            onClick={() => setMethod('vietqr')}
            className={`py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
              method === 'vietqr'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Chuyển Khoản</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {method === 'cash' ? (
            <div>
            </div>
          ) : (
            /* QR Transfer Mode */
            <div className="flex flex-col items-center justify-center p-2 text-center space-y-2.5">
              <div className="p-3 bg-white rounded-2xl border-2 border-amber-500/40 shadow-md">
                <img
                  src={qrUrl}
                  alt="Mã QR Chuyển Khoản Quán"
                  className="w-64 max-h-80 object-contain rounded-xl mx-auto"
                  onLoad={() => setQrLoaded(true)}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Quét mã QR để chuyển khoản thanh toán
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Ghi chú hóa đơn (tuỳ chọn)
            </label>
            <input
              type="text"
              placeholder="Ghi chú thêm về đơn hàng..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-850 space-y-2">
          <button
            type="button"
            disabled={processing || (isSplitMode && selectedSplitList.length === 0)}
            onClick={handleFinish}
            className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm sm:text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
              {isSplitMode
                ? selectedSplitList.length === 0
                  ? 'Vui lòng tick chọn món cần thanh toán lẻ'
                  : `Xác nhận thu tiền lẻ: ${formatCurrency(splitTotalAmount)} (Giữ lại ${formatCurrency(remainingTotalAmount)} ở bàn)`
                : method === 'cash'
                ? 'Thu tiền mặt'
                : 'Chuyển khoản'}
            </span>
          </button>

          {/* Delete button (Admin only) */}
          {canDelete && onDeleteOrder && (
            <button
              type="button"
              disabled={processing}
              onClick={onDeleteOrder}
              className="w-full py-2.5 px-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa đơn hàng</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
