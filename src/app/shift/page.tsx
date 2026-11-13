'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
  ShieldAlert,
  ShoppingBag,
  Lock,
  Edit3,
  ChevronRight,
  Clock,
  Tag,
} from 'lucide-react';

const formatNumberWithDots = (val: string | number): string => {
  const digits = String(val).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

const EXPENSE_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'tien_da', label: 'Mua đá bi', icon: '🧊' },
  { id: 'nguyen_lieu_phu', label: 'Nguyên liệu phụ (chanh, sữa, đường...)', icon: '🍋' },
  { id: 'dien_nuoc', label: 'Điện / Nước / Mạng Internet', icon: '⚡' },
  { id: 'vat_dung', label: 'Vật dụng (ly, ống hút, túi, giấy...)', icon: '📦' },
  { id: 'khac', label: 'Chi phí khác', icon: '📝' },
];

export default function DailyExpensesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { selectedDate, isToday, displayDate } = useDateFilter();

  const [expenses, setExpenses] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal detail & edit expense
  const [selectedExpense, setSelectedExpense] = useState<CashTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editAmountStr, setEditAmountStr] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editErrorMsg, setEditErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'owner') return;
    loadExpenses();

    const handleSync = () => loadExpenses();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadExpenses();
    };

    window.addEventListener('app:pull-to-refresh', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('app:pull-to-refresh', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
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

    const amount = Number(amountStr.replace(/\D/g, '')) || 0;
    if (amount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền chi lớn hơn 0');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Vui lòng nhập lý do chi');
      return;
    }

    if (!user || user.role !== 'owner') {
      setErrorMsg('Chỉ Chủ Quán (Owner) mới có quyền lập phiếu chi');
      return;
    }

    setIsSubmitting(true);
    try {
      await DataService.createCashTransaction({
        type: 'expense',
        category: 'khac',
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

  const handleOpenDetailModal = (item: CashTransaction) => {
    setSelectedExpense(item);
    setEditAmountStr(formatNumberWithDots(item.amount));
    setEditDescription(item.description || '');
    setEditDate(item.transaction_date || item.created_at?.slice(0, 10) || selectedDate);
    setEditErrorMsg('');
    setIsDetailModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    setEditErrorMsg('');

    const amount = Number(editAmountStr.replace(/\D/g, '')) || 0;
    if (amount <= 0) {
      setEditErrorMsg('Vui lòng nhập số tiền chi lớn hơn 0');
      return;
    }
    if (!editDescription.trim()) {
      setEditErrorMsg('Vui lòng nhập lý do chi');
      return;
    }

    if (!user || user.role !== 'owner') {
      setEditErrorMsg('Chỉ Chủ Quán (Owner) mới có quyền chỉnh sửa phiếu chi');
      return;
    }

    setIsSavingEdit(true);
    try {
      await DataService.updateCashTransaction(selectedExpense.id, {
        amount,
        description: editDescription.trim(),
        category: selectedExpense.category || 'khac',
        transactionDate: editDate,
      });

      setIsDetailModalOpen(false);
      setSelectedExpense(null);
      await loadExpenses();
    } catch (err: any) {
      setEditErrorMsg(err.message || 'Lỗi khi cập nhật phiếu chi');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFromDetail = async () => {
    if (!selectedExpense) return;
    if (!user || user.role !== 'owner') {
      alert('Chỉ Chủ Quán (Owner) mới có quyền xóa phiếu chi');
      return;
    }
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa phiếu chi "${selectedExpense.description}" (${formatCurrency(
          selectedExpense.amount
        )})? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      await DataService.deleteCashTransaction(selectedExpense.id);
      setIsDetailModalOpen(false);
      setSelectedExpense(null);
      await loadExpenses();
    } catch (err: any) {
      alert('Lỗi khi xóa phiếu chi: ' + (err.message || err));
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (!user || user.role !== 'owner') {
      alert('Chỉ Chủ Quán (Owner) mới có quyền xóa phiếu chi');
      return;
    }
    if (!confirm('Bạn có chắc chắn muốn xóa phiếu chi này?')) return;
    await DataService.deleteCashTransaction(id);
    await loadExpenses();
  };

  const totalExpenseAmount = expenses.reduce((acc, t) => acc + t.amount, 0);
  const maxExpenseAmount = expenses.reduce((max, t) => (t.amount > max ? t.amount : max), 0);

  if (authLoading) {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
          Đang nạp phiên làm việc...
        </span>
      </div>
    );
  }

  // Not logged in or logged in as staff
  if (!user || user.role !== 'owner') {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 dark:border-slate-700 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              Quyền Truy Cập Bị Hạn Chế
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {user
                ? `Tài khoản hiện tại (${user.full_name} - Nhân viên) không có quyền truy cập Sổ Quỹ Chi Tiêu. Trang này chỉ dành cho Chủ Quán (Owner).`
                : 'Bạn chưa đăng nhập. Vui lòng đăng nhập bằng tài khoản Quản trị để tiếp tục.'}
            </p>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/pos"
              className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Về Màn Hình POS Bán Hàng</span>
            </Link>

            <Link
              href="/staffs"
              className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Đăng Nhập Tài Khoản Khác</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
                  onClick={() => handleOpenDetailModal(item)}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-750/70 transition-all cursor-pointer group active:bg-slate-100 dark:active:bg-slate-700/60"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {cat?.icon || '📝'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                          {item.description || cat?.label || 'Khoản chi'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-semibold shrink-0">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">Người lập: <strong>{item.creator?.full_name || 'Nhân viên'}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 whitespace-nowrap">
                      -{formatCurrency(item.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetailModal(item);
                      }}
                      title="Xem chi tiết & sửa"
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteExpense(item.id);
                      }}
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
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
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="VD: 50.000"
                    value={amountStr}
                    onChange={(e) => setAmountStr(formatNumberWithDots(e.target.value))}
                    className="w-full pl-4 pr-14 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    VNĐ
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Lý do chi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mua 2 bao đá bi, mua sữa đặc, tiền điện..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
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

      {/* Modal Detail & Edit Expense */}
      {isDetailModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    Chi Tiết & Sửa Phiếu Chi
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Mã phiếu: #{selectedExpense.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-only metadata card */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Người lập phiếu
                </span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {selectedExpense.creator?.full_name || 'Nhân viên'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                  Thời gian tạo
                </span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {formatDateTime(selectedExpense.created_at)}
                </span>
              </div>
            </div>

            {editErrorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Số tiền chi (VNĐ) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    placeholder="VD: 50.000"
                    value={editAmountStr}
                    onChange={(e) => setEditAmountStr(formatNumberWithDots(e.target.value))}
                    className="w-full pl-4 pr-14 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-lg font-black focus:outline-none focus:ring-2 focus:ring-rose-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 pointer-events-none">
                    VNĐ
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Lý do chi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mua 2 bao đá bi, mua sữa đặc, tiền điện..."
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Ngày ghi nhận chi
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={handleDeleteFromDetail}
                  className="px-3.5 py-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa Phiếu Chi</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-4 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs transition-colors"
                  >
                    Đóng
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingEdit}
                    className="px-5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-extrabold text-xs shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
                  >
                    {isSavingEdit ? (
                      <span>Đang lưu...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Lưu Thay Đổi</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
