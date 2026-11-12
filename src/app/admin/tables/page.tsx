'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ActiveTableInfo, Order, DiningTable, PaymentMethod } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';
import { formatCurrency, formatTime, formatDateTime, parseOrderDate } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import {
  LayoutGrid,
  Utensils,
  CreditCard,
  Printer,
  Clock,
  ArrowRightLeft,
  XCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  AlertTriangle,
  User,
  CheckCircle2,
  X,
} from 'lucide-react';

export default function AdminTablesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedDate, displayDate } = useDateFilter();
  const [activeTables, setActiveTables] = useState<ActiveTableInfo[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // Tab "Giám sát bàn" đã gộp với /pos, chuyển hướng về /pos
    router.replace('/pos');
  }, [router]);

  // Modals state
  const [transferringTable, setTransferringTable] = useState<ActiveTableInfo | null>(null);
  const [targetTableName, setTargetTableName] = useState('');

  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('Khách đổi ý / Không lấy nữa');

  const [payingOrder, setPayingOrder] = useState<{
    orderId: number;
    orderNumber: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    tableName: string;
    tableId: number;
    order?: Order | null;
  } | null>(null);

  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadData();

    // Realtime subscription for automatic updates
    const unsubscribe = DataService.subscribeToTablesAndOrders(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [selectedDate]);

  const loadData = async () => {
    const activeTbls = await DataService.getActiveTablesWithOrders(selectedDate);
    setActiveTables(activeTbls);
  };

  // KPIs
  const occupiedList = activeTables.filter((t) => t.table.is_occupied);
  const occupiedCount = occupiedList.length;
  const totalTablesCount = activeTables.length;
  const totalPendingAmount = occupiedList.reduce((acc, t) => acc + t.totalAmount, 0);

  const longestSitting = occupiedList.reduce(
    (earliest, t) => {
      if (!earliest) return t;
      const timeT = t.activeOrder?.created_at ? parseOrderDate(t.activeOrder.created_at).getTime() : Infinity;
      const timeEarliest = earliest.activeOrder?.created_at ? parseOrderDate(earliest.activeOrder.created_at).getTime() : Infinity;
      return timeT < timeEarliest ? t : earliest;
    },
    null as ActiveTableInfo | null
  );

  const filtered = activeTables.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      return (
        t.table.name.toLowerCase().includes(q) ||
        t.activeOrder?.order_number.toLowerCase().includes(q) ||
        t.activeOrder?.creator?.full_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleTransferTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringTable?.activeOrder || !targetTableName.trim()) return;

    await DataService.transferTable(transferringTable.activeOrder.id, targetTableName.trim());
    setTransferringTable(null);
    setTargetTableName('');
    loadData();
  };

  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    await DataService.updateOrderStatus(
      cancellingOrder.id,
      'cancelled',
      cancelReason,
      user?.id
    );
    setCancellingOrder(null);
    loadData();
  };

  const handleCompletePayment = async (paymentMethod: PaymentMethod) => {
    if (!payingOrder) return;
    await DataService.updateOrderStatus(
      payingOrder.orderId,
      'completed',
      undefined,
      undefined,
      user?.id
    );
    setPayingOrder(null);
    loadData();
  };

  const handleSplitAndPayOrder = async (
    selectedItems: { itemId: number; quantity: number; itemName?: string; unitPrice?: number }[],
    paymentMethod: PaymentMethod,
    notes?: string
  ) => {
    if (!payingOrder) return;
    const result = await DataService.splitAndPayOrder({
      originalOrderId: payingOrder.orderId,
      selectedItems,
      paymentMethod,
      staffId: user?.id || '',
      notes,
    });
    setPayingOrder(null);
    loadData();
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-amber-500" />
              <span>Giám Sát Bàn Hoạt Động (Realtime)</span>
            </h1>
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Live Sync</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi tức thời tình trạng các bàn đang phục vụ, tiền tạm tính chưa thu và xử lý chuyển bàn
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center gap-1.5"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <Link
            href="/pos"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Mở Bàn Mới Tại POS</span>
          </Link>
        </div>
      </div>

      {/* Live KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Số bàn có khách */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Bàn Đang Có Khách
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 block">
              {occupiedCount} <span className="text-sm font-semibold text-slate-400">bàn</span>
            </span>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1 block">
              {occupiedCount > 0 ? 'Đang phục vụ trực tiếp' : 'Hiện chưa có khách'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <Utensils className="w-6 h-6" />
          </div>
        </div>

        {/* Tiền tạm tính ngoài sảnh */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Tiền Tạm Tính Ngoài Sảnh
            </span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
              {formatCurrency(totalPendingAmount)}
            </span>
            <span className="text-xs text-slate-400 mt-1 block">
              {occupiedCount} hóa đơn chưa thu tiền
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* Bàn ngồi lâu nhất */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Bàn Ngồi Sớm Nhất
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white mt-1 block truncate max-w-[180px]">
              {longestSitting ? longestSitting.table.name : 'Chưa có bàn nào'}
            </span>
            <span className="text-xs font-bold text-amber-600 mt-1 block">
              {longestSitting?.activeOrder?.created_at ? `Tạo lúc ${formatTime(longestSitting.activeOrder.created_at)}` : 'Sảnh đang trống'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-black text-sm text-slate-800 dark:text-white">
            Danh Sách Bàn Đang Phục Vụ ({filtered.length})
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {displayDate}
          </span>
        </div>

        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên bàn / tên khách / món..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Grid of Tables for Manager */}
      {filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
            <Utensils className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-800 dark:text-white">
            Hiện không có bàn nào đang phục vụ ({displayDate})
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Khi nhân viên mở bàn order tại quầy POS, các bàn sẽ xuất hiện và cập nhật dữ liệu tự động theo thời gian thực tại đây.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => {
            return (
              <div
                key={item.activeOrder?.id || item.table.id || item.table.name}
                className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-amber-500 shadow-md p-4 flex flex-col justify-between transition-all hover:shadow-xl"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                        <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                          {item.table.name}
                        </h3>
                      </div>
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                        {item.activeOrder?.order_number}
                      </span>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 inline-flex items-center gap-1 border border-slate-200/60 dark:border-slate-700">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{formatTime(item.activeOrder?.created_at)}</span>
                    </span>
                  </div>

                  {/* Drink items summary */}
                  <div className="my-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/80 text-xs space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-300">
                      <span>Món đang dùng:</span>
                      <span>NV tạo: {item.activeOrder?.creator?.full_name?.split(' ').pop() || 'Nhân viên'}</span>
                    </div>
                    <div className="max-h-24 overflow-y-auto space-y-0.5 pr-1">
                      {item.activeOrder?.items?.map((drink) => (
                        <div key={drink.id} className="flex justify-between items-center text-slate-800 dark:text-slate-100">
                          <span className="truncate pr-1">
                            <strong className="text-amber-600 dark:text-amber-400">{drink.quantity}x</strong> {drink.item_name} {drink.size_name && `(${drink.size_name})`}
                          </span>
                          <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                            {formatCurrency(drink.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Amount */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-400">Tạm tính:</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(item.totalAmount)}
                    </span>
                  </div>

                  {/* Manager Actions */}
                  <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setTransferringTable(item);
                        setTargetTableName('');
                      }}
                      className="py-2 px-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Chuyển sang bàn khác hoặc đổi tên khách"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />
                      <span>Đổi / Chuyển bàn</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => item.activeOrder && setReceiptOrder(item.activeOrder)}
                      className="py-2 px-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      title="In hóa đơn tạm tính"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>In bill</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setPayingOrder({
                          orderId: item.activeOrder!.id,
                          orderNumber: item.activeOrder!.order_number,
                          totalAmount: item.activeOrder!.total_amount,
                          discountAmount: item.activeOrder!.discount_amount,
                          finalAmount: item.activeOrder!.final_amount,
                          tableName: item.table.name,
                          tableId: item.table.id || 0,
                          order: item.activeOrder,
                        })
                      }
                      className="py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1 transition-all"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Thanh toán</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCancellingOrder(item.activeOrder)}
                      className="py-2 px-2 rounded-xl border border-rose-300 dark:border-rose-900/60 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                      title="Hủy bàn khẩn cấp"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Hủy bàn</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CHUYỂN BÀN / ĐỔI TÊN BÀN */}
      {transferringTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-amber-500" />
              <span>Chuyển Bàn / Đổi Tên Bàn</span>
            </h3>
            <p className="text-xs text-slate-400">
              Đang chuyển đơn của bàn <strong className="text-amber-600">{transferringTable.table.name}</strong> sang bàn mới:
            </p>

            <form onSubmit={handleTransferTable} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                  Tên bàn mới hoặc Tên khách quen *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="VD: Bàn 08, Anh Tuấn VIP, Bàn Sân Vườn..."
                  value={targetTableName}
                  onChange={(e) => setTargetTableName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                />
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1 py-1">
                {['Bàn 01', 'Bàn 02', 'Bàn 03', 'Bàn 04', 'Bàn 05', 'Bàn VIP', 'Mang về']
                  .filter((name) => name !== transferringTable.table.name)
                  .map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setTargetTableName(name)}
                      className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-amber-100"
                    >
                      {name}
                    </button>
                  ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferringTable(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
                >
                  Xác Nhận Chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HỦY BÀN */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-rose-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Hủy Bàn & Hóa Đơn {cancellingOrder.order_number}</span>
            </h3>
            <p className="text-xs text-slate-500">
              Chọn lý do hủy bàn để lưu lại biên bản đối soát cho chủ quán:
            </p>

            <select
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              <option value="Khách đổi ý / Không lấy nữa">Khách đổi ý / Không lấy nữa</option>
              <option value="Nhân viên nhập nhầm bàn">Nhân viên nhập nhầm bàn</option>
              <option value="Hết nguyên liệu pha chế">Hết nguyên liệu pha chế</option>
              <option value="Khách rời đi trước khi thanh toán">Khách rời đi trước khi thanh toán</option>
              <option value="Lý do khác">Lý do khác</option>
            </select>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30"
              >
                Xác Nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}



      {/* PAYMENT MODAL */}
      {payingOrder && (
        <PaymentModal
          isOpen={Boolean(payingOrder)}
          onClose={() => setPayingOrder(null)}
          totalAmount={payingOrder.totalAmount}
          discountAmount={payingOrder.discountAmount}
          finalAmount={payingOrder.finalAmount}
          table={{ id: payingOrder.tableId, name: payingOrder.tableName, is_occupied: true }}
          orderType="dine_in"
          orderNumber={payingOrder.orderNumber}
          order={payingOrder.order || null}
          onCompleteOrder={handleCompletePayment}
          onSplitAndPayOrder={handleSplitAndPayOrder}
        />
      )}

      {/* RECEIPT MODAL */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          isOpen={Boolean(receiptOrder)}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

