'use client';

import React, { useState, useEffect } from 'react';
import { CashTransaction } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';
import { formatCurrency, formatDateTime, formatTime } from '@/lib/utils';
import {
  WalletCards,
  PlusCircle,
  Receipt,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  TrendingDown,
  User,
  Coffee,
  X,
  FileText,
} from 'lucide-react';

const EXPENSE_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'tien_da', label: 'Mua đá bi', icon: '🧊' },
  { id: 'nguyen_lieu_phu', label: 'Nguyên liệu phụ (chanh, sữa, đường...)', icon: '🍋' },
  { id: 'dien_nuoc', label: 'Điện / Nước / Mạng Internet', icon: '⚡' },
  { id: 'vat_dung', label: 'Vật dụng (ly, ống hút, túi, giấy...)', icon: '📦' },
  { id: 'khac', label: 'Chi phí khác', icon: '📝' },
];

export default function DailyExpensesPage() {
  const { user } = useAuth();
  const { selectedDate, isToday, displayDate } = useDateFilter();

  const [expenses, setExpenses] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [category, setCategory] = useState('tien_da');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadExpenses();
  }, [selectedDate]);

  const loadExpenses = async () => {
    setLoading(true);
    const all = await DataService.getCashTransactions();
    // Filter by selectedDate and expense type
    const filtered = all.filter(
      (t) => t.type === 'expense' && (t.transaction_date === selectedDate || t.created_at.startsWith(selectedDate))
    );
    setExpenses(filtered);
    setLoading(false);
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const amount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền chi lớn hơn 0');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập diễn giải chi tiết cho khoản chi này');
      return;
    }

    if (!user) {
      setErrorMsg('Vui lòng đăng nhập để lập phiếu chi');
      return;
    }

    setIsSubmitting(true);
    try {
      await DataService.createCashTransaction({
        type: 'expense',
        category,
        amount,
        description: description.trim(),
        createdBy: user.id,
        transactionDate: selectedDate,
      });

      setAmountStr('');
      setDescription('');
      setIsModalOpen(false);
      await loadExpenses();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi lưu phiếu chi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu chi này?')) return;
    await DataService.deleteCashTransaction(id);
    await loadExpenses();
  };

  const totalExpenseAmount = expenses.reduce((acc, t) => acc + t.amount, 0);
  const maxExpenseAmount = expenses.reduce((max, t) => (t.amount > max ? t.amount : max), 0);

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <WalletCards className="w-6 h-6 text-amber-500" />
              <span>Sổ Quỹ Chi Tiêu Trong Ngày</span>
            </h1>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                isToday
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {displayDate}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ghi nhận và quản lý các khoản chi phát sinh tại quán: đá bi, chanh, sữa, điện nước...
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 flex items-center gap-2 self-start sm:self-auto transition-transform active:scale-95"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Lập Phiếu Chi Mới</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">Tổng tiền đã chi ({displayDate})</span>
          <span className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1 block">
            {formatCurrency(totalExpenseAmount)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{expenses.length} khoản chi</span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs text-slate-400 font-medium block">Khoản chi lớn nhất</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-1 block">
            {formatCurrency(maxExpenseAmount)}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {maxExpenseAmount > 0 ? 'Trong ngày' : 'Chưa có'}
          </span>
        </div>

        <div className="p-4 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2 sm:col-span-1">
          <span className="text-xs text-slate-400 font-medium block">Người lập gần nhất</span>
          <span className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mt-1 block truncate">
            {expenses[0]?.creator?.full_name || user?.full_name || 'Chưa có'}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {expenses[0] ? formatTime(expenses[0].created_at) : 'Hôm nay'}
          </span>
        </div>
      </div>

      {/* Expenses List Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" />
            <span>Danh Sách Các Khoản Chi Trong Ngày ({expenses.length})</span>
          </h2>
        </div>

        {expenses.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-700/50 text-slate-400 mx-auto flex items-center justify-center">
              <FileText className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Chưa có khoản chi nào cho ngày {displayDate}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Khi quán có phát sinh mua đá bi, sữa, chanh, đồ dùng..., hãy bấm nút bên dưới để ghi nhận.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              + Tạo Phiếu Chi Đầu Tiên
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {expenses.map((item) => {
              const cat = EXPENSE_CATEGORIES.find((c) => c.id === item.category);
              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-xl flex items-center justify-center shrink-0">
                      {cat?.icon || '📝'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {cat?.label || item.category}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <User className="w-3 h-3" />
                        <span>Người lập: <strong>{item.creator?.full_name || 'Nhân viên'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -{formatCurrency(item.amount)}
                    </span>
                    <button
                      onClick={() => handleDeleteExpense(item.id)}
                      title="Xóa phiếu chi này"
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Create Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-rose-500" />
                <span>Lập Phiếu Chi Mới ({displayDate})</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Số tiền chi (VNĐ) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    required
                    placeholder="VD: 50000"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>

                {/* Quick amount chips */}
                <div className="flex items-center gap-1.5 mt-2">
                  {[20000, 35000, 50000, 100000, 200000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountStr(String(val))}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200"
                    >
                      {val.toLocaleString()}đ
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Danh mục chi *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Diễn giải chi tiết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mua 2 bao đá bi ca trưa..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-750 text-[11px] text-slate-500 space-y-1">
                <div>Người lập phiếu: <strong className="text-slate-800 dark:text-white">{user?.full_name || 'Chưa đăng nhập'}</strong></div>
                <div>Ngày ghi nhận: <strong className="text-slate-800 dark:text-white">{displayDate}</strong></div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Đang lưu...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lưu Phiếu Chi</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
