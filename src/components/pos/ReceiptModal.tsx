'use client';

import React from 'react';
import { Order } from '@/types/database';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Printer, X, Check } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ order, isOpen, onClose }: ReceiptModalProps) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Action Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850 print:hidden">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Printer className="w-4 h-4 text-amber-600" />
            <span>Xem & In Hóa Đơn Khổ K80/K58</span>
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div
          id="printable-receipt"
          className="p-6 bg-white text-black font-mono text-xs overflow-y-auto space-y-3"
          style={{ width: '100%', maxWidth: '80mm', margin: '0 auto' }}
        >
          {/* Shop Info */}
          <div className="text-center space-y-0.5">
            <h2 className="text-base font-black uppercase tracking-wider">CÀ PHÊ NHÀ MẪU</h2>
            <p className="text-[10px] text-gray-600">Đ/c: 123 Đường Cà Phê, Quận 1, TP.HCM</p>
            <p className="text-[10px] text-gray-600">Hotline / Zalo: 0901.234.567</p>
            <p className="text-[10px] text-gray-600">Wifi: CaPheNhaMau | Pass: 88888888</p>
            <div className="pt-2">
              <span className="text-sm font-black border-y border-dashed border-gray-400 py-1 block">
                PHIẾU THANH TOÁN
              </span>
            </div>
          </div>

          {/* Order Meta */}
          <div className="text-[11px] space-y-0.5 border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between">
              <span>Mã đơn: <strong>{order.order_number}</strong></span>
              <span>{order.order_type === 'dine_in' ? order.table_name || order.table?.name || 'Tại bàn' : 'Mang về (Takeaway)'}</span>
            </div>
            <div className="flex justify-between text-gray-600 text-[10px]">
              <span>Ngày: {formatDateTime(order.created_at)}</span>
              <span>Tạo bởi: {order.creator?.full_name?.split(' ').pop() || 'NV'}</span>
            </div>
            {order.completer && (
              <div className="flex justify-between text-gray-600 text-[10px]">
                <span>Thanh toán lúc: {order.completed_at ? formatDateTime(order.completed_at) : 'Đã xong'}</span>
                <span>Thu ngân: {order.completer.full_name?.split(' ').pop()}</span>
              </div>
            )}
          </div>

          {/* Items Table */}
          <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between font-bold text-[10px] text-gray-600 border-b border-gray-200 pb-1">
              <span className="w-1/2">Tên món</span>
              <span className="w-1/6 text-center">SL</span>
              <span className="w-1/3 text-right">T.Tiền</span>
            </div>

            {order.items?.map((item) => (
              <div key={item.id} className="text-[11px]">
                <div className="flex justify-between items-start">
                  <span className="w-1/2 font-bold leading-tight">
                    {item.item_name}
                    {item.size_name && ` (${item.size_name})`}
                  </span>
                  <span className="w-1/6 text-center font-bold">{item.quantity}</span>
                  <span className="w-1/3 text-right font-bold">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
                {item.notes && (
                  <p className="text-[9px] text-gray-500 italic pl-1">
                    * {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Pricing Totals */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Tổng tiền món:</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>

            {order.discount_amount > 0 && (
              <div className="flex justify-between text-gray-700">
                <span>Giảm giá:</span>
                <span>- {formatCurrency(order.discount_amount)}</span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black border-t border-dashed border-gray-400 pt-1.5">
              <span>THANH TOÁN:</span>
              <span>{formatCurrency(order.final_amount)}</span>
            </div>

            <div className="flex justify-between text-[10px] text-gray-600 pt-0.5">
              <span>Phương thức:</span>
              <span>{order.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
            </div>
          </div>

          {/* Footer greeting */}
          <div className="text-center pt-3 border-t border-dashed border-gray-300 space-y-0.5">
            <p className="font-bold text-[11px]">Cảm ơn Quý Khách & Hẹn Gặp Lại!</p>
            <p className="text-[9px] text-gray-500">Mật khẩu Wifi: CaPheNhaMau</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center gap-2 print:hidden">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>In Phiếu (Ctrl+P)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

