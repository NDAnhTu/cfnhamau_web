'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Order } from '@/types/database';
import { DataService, isAwaitingPaymentConfirmation } from '@/lib/data-service';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';
import { formatCurrency, formatTime, formatDateTime, getLocalDateString } from '@/lib/utils';
import { PosAdminTabs } from '@/components/pos/PosAdminTabs';
import {
  Receipt,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  DollarSign,
  QrCode,
  LayoutGrid,
  RotateCcw,
  Trash2,
} from 'lucide-react';

export default function StaffOrdersPage() {
  const { user, isStaff } = useAuth();
  const { selectedDate, displayDate } = useDateFilter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();

    // Realtime changes listener
    const unsubscribe = DataService.subscribeToTablesAndOrders(() => {
      loadOrders();
    });

    return () => {
      unsubscribe();
    };
  }, [selectedDate]);

  const loadOrders = async () => {
    const list = await DataService.getOrders();
    setOrders(list);
  };

  // Only display completed orders that are CONFIRMED by admin (Bàn đã thanh toán)
  const completedOrders = orders.filter((o) => {
    if (o.status !== 'completed') return false;
    if (isAwaitingPaymentConfirmation(o)) return false;
    if (selectedDate && !o.created_at.startsWith(selectedDate) && getLocalDateString(o.created_at) !== selectedDate) return false;
    return true;
  });

  const unconfirmedCount = orders.filter((o) => {
    if (!isAwaitingPaymentConfirmation(o)) return false;
    if (selectedDate && !o.created_at.startsWith(selectedDate) && getLocalDateString(o.created_at) !== selectedDate) return false;
    return true;
  }).length;

  const handleRevertToPending = async (order: Order) => {
    if (
      !confirm(
        `Bạn có chắc muốn chuyển đơn ${order.order_number} (${
          order.table_name || 'Tại bàn'
        }) sang "Chưa thanh toán"? Bàn này sẽ xuất hiện lại trên màn hình Bàn Đang Phục Vụ.`
      )
    ) {
      return;
    }

    try {
      await DataService.updateOrderStatus(order.id, 'pending');
      setBanner(
        `Đã chuyển đơn ${order.order_number} (${
          order.table_name || 'Tại bàn'
        }) về trạng thái Chưa thanh toán thành công!`
      );
      setSelectedOrder(null);
      await loadOrders();
      setTimeout(() => setBanner(null), 5000);
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  const handleDeleteOrder = async (order: Order) => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn đơn hàng ${order.order_number} này không? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      await DataService.deleteOrder(order.id);
      setBanner(`Đã xóa vĩnh viễn đơn hàng ${order.order_number} thành công!`);
      setSelectedOrder(null);
      await loadOrders();
      setTimeout(() => setBanner(null), 5000);
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 space-y-3">
      {/* Success banner */}
      {banner && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold shadow-sm animate-in fade-in">
          <span>{banner}</span>
          <button onClick={() => setBanner(null)} className="underline text-xs shrink-0 ml-2">
            Đóng
          </button>
        </div>
      )}

      {/* TOP VIEW SWITCHER: Sơ Đồ Bàn - Xác Nhận Thanh Toán - Bàn Đã Thanh Toán */}
      {!isStaff && (
        <PosAdminTabs
          activeTab="completed"
          unconfirmedCount={unconfirmedCount}
          completedCount={completedOrders.length}
        />
      )}

      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isStaff && (
            <Link
              href="/pos"
              className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span>Danh Sách Bàn Đã Thanh Toán ({completedOrders.length})</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {displayDate}
            </span>
          </h1>
        </div>
      </div>

      {/* Orders List & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Orders Card List */}
        <div className="lg:col-span-7 space-y-3">
          {completedOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <Receipt className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Chưa có đơn hàng nào đã thanh toán trong ngày này
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Các đơn bàn sau khi thanh toán thành công sẽ xuất hiện tại đây
              </p>
            </div>
          ) : (
            completedOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`p-4 rounded-3xl border transition-all cursor-pointer bg-white dark:bg-slate-800 ${
                    isSelected
                      ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:border-amber-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {order.order_number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {order.order_type === 'dine_in'
                          ? order.table_name || order.table?.name || 'Tại bàn'
                          : 'Mang đi'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Đã thanh toán
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-slate-400">
                      {formatTime(order.completed_at || order.created_at)}
                    </span>
                  </div>

                  {/* Items summary */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1 mb-3">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <span className="truncate pr-2">
                          <span className="font-bold">{item.quantity}x</span> {item.item_name}{' '}
                          {item.size_name && `(${item.size_name})`}
                        </span>
                        <span className="font-medium text-slate-500">
                          {formatCurrency(item.subtotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Footer card info */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-400">
                      {order.payment_method === 'cash' ? (
                        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Tiền mặt
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 font-medium text-slate-500 dark:text-slate-400">
                          <QrCode className="w-3.5 h-3.5 text-blue-500" /> VietQR
                        </span>
                      )}
                      <span>•</span>
                      <span>Tạo: {order.creator?.full_name || 'Nhân viên'}</span>
                      {order.completer && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Thu: {order.completer.full_name}
                          </span>
                        </>
                      )}
                    </div>

                    <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(order.final_amount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Order Actions Panel (Desktop) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-16">
          {selectedOrder ? (
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Chi Tiết {selectedOrder.order_number}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bàn: {selectedOrder.table_name || selectedOrder.table?.name || 'Tại bàn'} • Lúc{' '}
                    {formatDateTime(selectedOrder.created_at)}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Đã thanh toán
                </span>
              </div>

              {/* Creator & Cashier info */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Người tạo đơn:</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {selectedOrder.creator?.full_name || 'Nhân viên'}
                  </span>
                </div>
                {selectedOrder.completer && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400">Người thanh toán:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      {selectedOrder.completer.full_name}
                    </span>
                  </div>
                )}
                {selectedOrder.completed_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Thời gian hoàn tất:</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {formatTime(selectedOrder.completed_at)}
                    </span>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <span className="text-slate-400">Ghi chú:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {selectedOrder.notes}
                    </span>
                  </div>
                )}
              </div>

              {/* Items detail */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">
                        {item.quantity}x {item.item_name}
                      </p>
                      {item.size_name && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                          Kích cỡ: {item.size_name}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          Ghi chú: {item.notes}
                        </p>
                      )}
                    </div>
                    <span className="font-black text-slate-700 dark:text-slate-200">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price summary */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Tổng tiền món:</span>
                  <span>{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-rose-500">
                    <span>Giảm giá:</span>
                    <span>- {formatCurrency(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1">
                  <span>Thực thu:</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    {formatCurrency(selectedOrder.final_amount)}
                  </span>
                </div>
              </div>

              {/* Action Buttons: Chuyển sang chưa thanh toán & Xoá đơn hàng */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => handleRevertToPending(selectedOrder)}
                  className="w-full py-2.5 rounded-2xl border-2 border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Chuyển Sang Chưa Thanh Toán</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-rose-600/20"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xoá Đơn Hàng</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">Chọn một đơn hàng để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* Selected Order Mobile Modal (lg:hidden) */}
      {selectedOrder && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full sm:max-w-lg bg-white dark:bg-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3 flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Chi Tiết {selectedOrder.order_number}
                </h3>
                <p className="text-xs text-slate-400">
                  Bàn: {selectedOrder.table_name || selectedOrder.table?.name || 'Tại bàn'} • Lúc{' '}
                  {formatDateTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Creator & Cashier info */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Người tạo đơn:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedOrder.creator?.full_name || 'Nhân viên'}
                </span>
              </div>
              {selectedOrder.completer && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Người thanh toán:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedOrder.completer.full_name}
                  </span>
                </div>
              )}
              {selectedOrder.completed_at && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Thời gian xong:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {formatTime(selectedOrder.completed_at)}
                  </span>
                </div>
              )}
              {selectedOrder.notes && (
                <div className="flex justify-between items-center pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">Ghi chú:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {selectedOrder.notes}
                  </span>
                </div>
              )}
            </div>

            {/* Items detail */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {selectedOrder.items?.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-xs flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">
                      {item.quantity}x {item.item_name}
                    </p>
                    {item.size_name && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                        Kích cỡ: {item.size_name}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-[11px] text-slate-400 italic">
                        Ghi chú: {item.notes}
                      </p>
                    )}
                  </div>
                  <span className="font-black text-slate-700 dark:text-slate-200">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tổng tiền món:</span>
                <span>{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
              {selectedOrder.discount_amount > 0 && (
                <div className="flex justify-between text-rose-500">
                  <span>Giảm giá:</span>
                  <span>- {formatCurrency(selectedOrder.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1">
                <span>Thực thu:</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {formatCurrency(selectedOrder.final_amount)}
                </span>
              </div>
            </div>

            {/* Action Buttons: Chuyển sang chưa thanh toán & Xoá đơn hàng */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => handleRevertToPending(selectedOrder)}
                className="w-full py-2.5 rounded-2xl border-2 border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Chuyển Sang Chưa Thanh Toán</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteOrder(selectedOrder)}
                className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-rose-600/20"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xoá Đơn Hàng</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
