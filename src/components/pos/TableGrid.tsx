'use client';

import React, { useState } from 'react';
import { ActiveTableInfo, Order } from '@/types/database';
import { formatCurrency, formatTime, getItemAttribution } from '@/lib/utils';
import {
  Utensils,
  PlusCircle,
  CreditCard,
  Printer,
  Clock,
  User,
  Coffee,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  X,
} from 'lucide-react';

interface TableGridProps {
  tables: ActiveTableInfo[];
  onSelectEmptyTable: (tableName: string) => void;
  onAddMoreItems: (tableInfo: ActiveTableInfo) => void;
  onCheckoutTable: (tableInfo: ActiveTableInfo) => void;
  onPrintReceipt: (order: Order) => void;
  onQuickNewTable: (tableName: string) => void;
}

export function TableGrid({
  tables,
  onSelectEmptyTable,
  onAddMoreItems,
  onCheckoutTable,
  onPrintReceipt,
  onQuickNewTable,
}: TableGridProps) {
  const [search, setSearch] = useState('');
  const [isNewTableModalOpen, setIsNewTableModalOpen] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [selectedTableDetail, setSelectedTableDetail] = useState<ActiveTableInfo | null>(null);

  const activeModalTable = selectedTableDetail
    ? tables.find(
        (t) =>
          (t.activeOrder?.id && t.activeOrder?.id === selectedTableDetail.activeOrder?.id) ||
          t.table.id === selectedTableDetail.table.id
      ) || selectedTableDetail
    : null;

  const filtered = tables.filter((t) => {
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = t.table.name.toLowerCase().includes(q);
      const matchOrder = t.activeOrder?.order_number.toLowerCase().includes(q);
      const matchCreator = t.activeOrder?.creator?.full_name?.toLowerCase().includes(q);
      return matchName || matchOrder || matchCreator;
    }
    return true;
  });

  const handleCreateNewTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim()) return;
    onQuickNewTable(newTableName.trim());
    setNewTableName('');
    setIsNewTableModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Count banner */}
        <div className="flex items-center gap-2 shrink-0">
          <h2 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bàn Đang Phục Vụ ({tables.length})</span>
          </h2>
        </div>

        {/* Search & New Table Button */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto sm:max-w-md md:max-w-lg sm:flex-1 sm:justify-end">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm bàn, tên khách, món..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-amber-500 shadow-sm transition-all"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsNewTableModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-1.5 shrink-0 transition-transform active:scale-95 whitespace-nowrap"
          >
            <span>+ Thêm Bàn</span>
          </button>
        </div>
      </div>

      {/* Grid of Active Tables */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filtered.map((item) => (
            <div
              key={item.activeOrder?.id || item.table.id || item.table.name}
              onClick={() => setSelectedTableDetail(item)}
              className="bg-white dark:bg-slate-800 rounded-3xl border-2 border-amber-500/80 shadow-md p-4 flex flex-col justify-between transition-all hover:shadow-lg hover:border-amber-600 relative overflow-hidden cursor-pointer group"
            >
              {/* Header tag */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                      {item.table.name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 block">
                    Đơn {item.activeOrder?.order_number}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-slate-100 text-slate-700 dark:bg-slate-750 dark:text-slate-300 inline-flex items-center gap-1 border border-slate-200/60 dark:border-slate-700">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>{formatTime(item.activeOrder?.created_at)}</span>
                  </span>
                </div>
              </div>

              {/* Creator info */}
              <div className="mb-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-amber-500" />
                <span>Tạo bởi: <strong className="text-slate-700 dark:text-slate-200">{item.activeOrder?.creator?.full_name || 'Nhân viên'}</strong></span>
              </div>

              {/* Items preview */}
              <div className="my-1.5 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-750/70 border border-slate-100 dark:border-slate-700/60 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Món đang dùng ({item.itemsCount} ly):
                </span>
                <div className="space-y-0.5 max-h-24 overflow-y-auto pr-1">
                  {item.activeOrder?.items?.map((drink) => (
                    <div key={drink.id} className="flex justify-between items-center text-slate-700 dark:text-slate-200">
                      <span className="truncate pr-1">
                        <strong className="text-amber-600 dark:text-amber-400">{drink.quantity}x</strong> {drink.item_name} {drink.size_name && `(${drink.size_name})`}
                      </span>
                      <span className="font-semibold text-slate-500 text-[11px]">
                        {formatCurrency(drink.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total amount */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  Tạm tính:
                </span>
                <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(item.totalAmount)}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddMoreItems(item);
                  }}
                  className="py-2 px-1 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-[11px] hover:bg-amber-100 transition-colors flex flex-col items-center justify-center gap-0.5"
                  title="Khách gọi thêm món vào bàn này"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Thêm món</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckoutTable(item);
                  }}
                  className="py-2 px-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] shadow-sm transition-all flex flex-col items-center justify-center gap-0.5"
                  title="Khách thanh toán tiền mặt / VietQR"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Thanh toán</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-12 text-center border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
            <Coffee className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 dark:text-white text-base">
            Chưa có bàn nào đang phục vụ
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Khi khách vào quán, nhấn nút bên dưới để nhập tên bàn và tiến hành chọn đồ uống.
          </p>
          <button
            type="button"
            onClick={() => setIsNewTableModalOpen(true)}
            className="px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all inline-flex items-center gap-2"
          >
            <span>+ Thêm Bàn</span>
          </button>
        </div>
      )}

      {/* MODAL CHI TIẾT BÀN & MÓN ĂN THEO NHÂN VIÊN */}
      {activeModalTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-700/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
                    {activeModalTable.table.name}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Đơn {activeModalTable.activeOrder?.order_number}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Giờ vào: <strong>{formatTime(activeModalTable.activeOrder?.created_at)}</strong></span>
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-amber-500" />
                    <span>Mở bàn: <strong className="text-slate-700 dark:text-slate-200">{activeModalTable.activeOrder?.creator?.full_name || 'Nhân viên'}</strong></span>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTableDetail(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Đóng chi tiết"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Items List */}
            <div className="my-3 flex-1 overflow-y-auto pr-1">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Chi tiết món đã gọi ({activeModalTable.itemsCount} ly/món):
              </div>
              <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-slate-700/60">
                {activeModalTable.activeOrder?.items?.map((item, idx) => {
                  const { staffName, itemNote } = getItemAttribution(
                    item,
                    activeModalTable.activeOrder?.creator?.full_name
                  );
                  return (
                    <div key={item.id || idx} className="pt-2.5 first:pt-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="inline-flex items-center justify-center min-w-[26px] h-6 px-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-black text-xs shrink-0">
                            {item.quantity}x
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-sm text-slate-800 dark:text-slate-100 leading-snug">
                              {item.item_name}
                              {item.size_name && (
                                <span className="text-xs font-normal text-slate-500 ml-1">
                                  ({item.size_name})
                                </span>
                              )}
                            </div>
                            {/* Staff attribution & item notes */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                <User className="w-2.5 h-2.5 text-amber-500" />
                                <span>Thêm bởi: <strong className="text-slate-800 dark:text-slate-100">{staffName}</strong></span>
                              </span>
                              {itemNote && (
                                <span className="inline-flex items-center text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/60">
                                  {itemNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-slate-400">
                            {formatCurrency(item.unit_price)}
                          </div>
                          <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                            {formatCurrency(item.subtotal)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Total Section */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                Tổng tạm tính:
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(activeModalTable.totalAmount)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <button
                type="button"
                onClick={() => {
                  onAddMoreItems(activeModalTable);
                  setSelectedTableDetail(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4 text-amber-600" />
                <span>Gọi thêm món</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onCheckoutTable(activeModalTable);
                  setSelectedTableDetail(null);
                }}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1.5"
              >
                <CreditCard className="w-4 h-4" />
                <span>Thanh toán</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MỞ BÀN MỚI */}
      {isNewTableModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Thêm Bàn</span>
            </h3>

            <form onSubmit={handleCreateNewTable} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="VD: Bàn 1, Bàn 2,..."
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewTableModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20"
                >
                  Vào Chọn Món ➔
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
