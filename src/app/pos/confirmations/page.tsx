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
  RotateCcw,
  Trash2,
  Clock,
  User,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export default function PosConfirmationsPage() {
  const { user, isStaff } = useAuth();
  const { selectedDate, displayDate } = useDateFilter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadOrders();

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

  // Only display orders waiting for admin payment confirmation
  const unconfirmedOrders = orders.filter((o) => {
    if (!isAwaitingPaymentConfirmation(o)) return false;
    if (selectedDate && !o.created_at.startsWith(selectedDate) && getLocalDateString(o.created_at) !== selectedDate) return false;
    return true;
  });

  const completedCount = orders.filter((o) => {
    if (o.status !== 'completed') return false;
    if (isAwaitingPaymentConfirmation(o)) return false;
    if (selectedDate && !o.created_at.startsWith(selectedDate) && getLocalDateString(o.created_at) !== selectedDate) return false;
    return true;
  }).length;

  const handleConfirmPayment = async (order: Order) => {
    setIsProcessing(true);
    try {
      await DataService.confirmOrderPayment(order.id, user?.id);
      setBanner(
        `Đã xác nhận nhận đủ tiền cho đơn ${order.order_number} (${
          order.table_name || 'Tại bàn'
        }) thành công! Đơn đã chuyển sang "Bàn đã thanh toán".`
      );
      setSelectedOrder(null);
      await loadOrders();
      setTimeout(() => setBanner(null), 6000);
    } catch (e: any) {
      alert('Lỗi xác nhận tiền: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevertToPending = async (order: Order) => {
    if (
      !confirm(
        `Bạn có chắc muốn chuyển đơn ${order.order_number} (${
          order.table_name || 'Tại bàn'
        }) về "Chưa thanh toán"? Bàn này sẽ xuất hiện lại trên màn hình Sơ Đồ Bàn.`
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
          activeTab="confirmations"
          unconfirmedCount={unconfirmedOrders.length}
          completedCount={completedCount}
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
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Xác Nhận Thanh Toán ({unconfirmedOrders.length})</span>
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
          {unconfirmedOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-80" />
              <p className="font-bold text-base text-slate-800 dark:text-slate-200">
                Không có đơn nào chờ xác nhận tiền
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Khi nhân viên thu tiền bàn, đơn hàng sẽ hiển thị ở đây để bạn kiểm tra và xác nhận &quot;Đã nhận được tiền&quot;.
              </p>
            </div>
          ) : (
            unconfirmedOrders.map((order) => {
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {order.order_number}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {order.order_type === 'dine_in'
                          ? order.table_name || order.table?.name || 'Tại bàn'
                          : 'Mang đi'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold uppercase bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span>Chờ xác nhận tiền</span>
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

                  {/* Footer info: Staff & Amount */}
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 font-medium">
                        {order.payment_method === 'cash' ? (
                          <>
                            <DollarSign className="w-3 h-3 text-emerald-500" />
                            Tiền mặt
                          </>
                        ) : (
                          <>
                            <QrCode className="w-3 h-3 text-blue-500" />
                            VietQR
                          </>
                        )}
                      </span>
                      <span className="text-[11px]">
                        Thu bởi: <strong>{order.completer?.full_name || order.creator?.full_name || 'Nhân viên'}</strong>
                      </span>
                    </div>

                    <span className="text-base font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(order.final_amount)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Order Detail Panel (lg:col-span-5) */}
        <div className="hidden lg:block lg:col-span-5 sticky top-4">
          {selectedOrder ? (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
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
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Chờ Xác Nhận
                </span>
              </div>

              {/* Creator & Cashier info */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Nhân viên thu tiền:</span>
                  <span className="font-black text-amber-700 dark:text-amber-300">
                    {selectedOrder.completer?.full_name || selectedOrder.creator?.full_name || 'Nhân viên'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Hình thức thanh toán:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedOrder.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản (VietQR)'}
                  </span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between items-center pt-1 border-t border-amber-500/20">
                    <span className="text-slate-500 dark:text-slate-400">Ghi chú:</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                      {selectedOrder.notes.replaceAll('[CHỜ XÁC NHẬN TIỀN]', '').trim() || 'Không có'}
                    </span>
                  </div>
                )}
              </div>

              {/* Items detail list */}
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-750"
                  >
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-100">
                        {item.quantity}x {item.item_name}
                      </div>
                      {item.size_name && (
                        <div className="text-[10px] text-slate-400">{item.size_name}</div>
                      )}
                    </div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {formatCurrency(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Price summary */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
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
                  <span>Số tiền cần nhận:</span>
                  <span className="text-amber-600 dark:text-amber-400 text-base">
                    {formatCurrency(selectedOrder.final_amount)}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS: ĐÃ NHẬN ĐƯỢC TIỀN */}
              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleConfirmPayment(selectedOrder)}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99]"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Đã Nhận Được Tiền ({formatCurrency(selectedOrder.final_amount)})</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleRevertToPending(selectedOrder)}
                  className="w-full py-2.5 rounded-2xl border border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4 text-amber-600" />
                  <span>Chưa Nhận Tiền (Chuyển Lại Bàn)</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => handleDeleteOrder(selectedOrder)}
                  className="w-full py-2 rounded-2xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xoá Đơn Hàng</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <ChevronRight className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-bold">Chọn một đơn hàng để kiểm tra & xác nhận tiền</p>
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
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Nhân viên thu tiền:</span>
                <span className="font-black text-amber-700 dark:text-amber-300">
                  {selectedOrder.completer?.full_name || selectedOrder.creator?.full_name || 'Nhân viên'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Hình thức thanh toán:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedOrder.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản (VietQR)'}
                </span>
              </div>
            </div>

            {/* Items detail list */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {selectedOrder.items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-50 dark:bg-slate-750"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">
                      {item.quantity}x {item.item_name}
                    </div>
                    {item.size_name && (
                      <div className="text-[10px] text-slate-400">{item.size_name}</div>
                    )}
                  </div>
                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    {formatCurrency(item.subtotal)}
                  </div>
                </div>
              ))}
            </div>

            {/* Price summary */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Tổng tiền:</span>
                <span>{formatCurrency(selectedOrder.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white pt-1">
                <span>Số tiền cần nhận:</span>
                <span className="text-amber-600 dark:text-amber-400 text-base">
                  {formatCurrency(selectedOrder.final_amount)}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS: ĐÃ NHẬN ĐƯỢC TIỀN */}
            <div className="pt-2 space-y-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleConfirmPayment(selectedOrder)}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.99]"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Đã Nhận Được Tiền ({formatCurrency(selectedOrder.final_amount)})</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleRevertToPending(selectedOrder)}
                className="w-full py-2.5 rounded-2xl border border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>Chưa Nhận Tiền (Chuyển Lại Bàn)</span>
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleDeleteOrder(selectedOrder)}
                className="w-full py-2 rounded-2xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
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

