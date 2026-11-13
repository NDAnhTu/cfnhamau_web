'use client';

import React, { useState, useEffect } from 'react';
import { Shift, CashTransaction } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';
import { formatCurrency, formatDateTime, getLocalDateString } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
import {
  WalletCards,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Receipt,
  TrendingDown,
  TrendingUp,
  History,
} from 'lucide-react';

export default function AdminCashFlowPage() {
  const { user } = useAuth();
  const { selectedDate, displayDate } = useDateFilter();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);

  // Create transaction modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txnType, setTxnType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('tien_da');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    loadData();

    const handleSync = () => loadData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadData();
    };

    window.addEventListener('app:pull-to-refresh', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('app:pull-to-refresh', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [selectedDate]);

  const loadData = async () => {
    const [allShifts, allTxns] = await Promise.all([
      DataService.getShifts(),
      DataService.getCashTransactions(),
    ]);
    setShifts(allShifts);

    // Chỉ hiển thị thu chi của ngày đang được chọn
    const filteredTxns = allTxns.filter((t) => {
      if (!selectedDate) return true;
      const matchDateStr = t.transaction_date === selectedDate;
      const matchCreatedAt = t.created_at?.startsWith(selectedDate);
      const matchLocal = getLocalDateString(t.created_at) === selectedDate;
      return matchDateStr || matchCreatedAt || matchLocal;
    });

    setTransactions(filteredTxns);
  };

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountStr.replace(/[^0-9]/g, '')) || 0;
    if (amount <= 0 || !description.trim()) {
      alert('Vui lòng nhập số tiền và nội dung thu chi');
      return;
    }

    await DataService.createCashTransaction({
      type: txnType,
      category,
      amount,
      description: description.trim(),
      createdBy: user?.id || '',
      transactionDate: selectedDate,
    });

    setIsModalOpen(false);
    setAmountStr('');
    setDescription('');
    loadData();
  };

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const netCashFlow = totalIncome - totalExpense;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <WalletCards className="w-6 h-6 text-amber-500" />
            <span>Quản Lý Sổ Quỹ & Chi Phí Hoạt Động</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Theo dõi chi phí vận hành (đá, nguyên liệu phụ, điện nước) và các khoản thu chi khác
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Lập Phiếu Thu / Chi Mới</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
            Tổng Thu Ngoài (Quỹ)
          </span>
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
            + {formatCurrency(totalIncome)}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
            Tổng Chi Ngoài (Chi phí)
          </span>
          <span className="text-2xl font-black text-rose-500 mt-1 block">
            - {formatCurrency(totalExpense)}
          </span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider block">
            Dòng Tiền Thu Chi Ròng
          </span>
          <span
            className={`text-2xl font-black mt-1 block ${
              netCashFlow >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-500'
            }`}
          >
            {netCashFlow >= 0 ? '+' : ''}
            {formatCurrency(netCashFlow)}
          </span>
        </div>
      </div>

      {/* CASH TRANSACTIONS VOUCHERS TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-5 space-y-4">
        <div>
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" />
            <span>Sổ Nhật Ký Thu Chi ({transactions.length} phiếu)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Chi tiết các khoản tiền đá, phụ liệu, sinh hoạt phí và thu ngoài trong ngày ({displayDate})
          </p>
        </div>

        {/* Mobile View: Cards */}
        <div className="md:hidden space-y-2.5">
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">Chưa có giao dịch thu chi nào trong ngày {displayDate}.</div>
          ) : (
            transactions.map((t) => (
              <div
                key={t.id}
                className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-750/50 border border-slate-100 dark:border-slate-700 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      t.type === 'expense'
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {t.type === 'expense' ? 'Phiếu Chi' : 'Phiếu Thu'}
                  </span>
                  <span className={`font-black text-sm ${t.type === 'expense' ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {t.description}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                  <span>Mục: <strong className="text-slate-600 dark:text-slate-300">{t.category}</strong></span>
                  <span>{formatDateTime(t.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop / iPad View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-850 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3">Thời gian</th>
                <th className="py-3 px-3">Loại phiếu</th>
                <th className="py-3 px-3">Danh mục</th>
                <th className="py-3 px-3">Nội dung chi tiết</th>
                <th className="py-3 px-3">Người lập phiếu</th>
                <th className="py-3 px-3 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    Chưa có giao dịch thu chi nào trong ngày {displayDate}.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                  <td className="py-3 px-3 text-slate-500">
                    {formatDateTime(t.created_at)}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        t.type === 'expense'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {t.type === 'expense' ? 'Phiếu Chi' : 'Phiếu Thu'}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-semibold text-slate-700 dark:text-slate-300">
                    {t.category}
                  </td>

                  <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                    {t.description}
                  </td>

                  <td className="py-3 px-3 text-slate-500">
                    {t.creator?.full_name || 'Nhân viên'}
                  </td>

                  <td className="py-3 px-3 text-right font-black text-sm">
                    <span className={t.type === 'expense' ? 'text-rose-500' : 'text-emerald-600'}>
                      {t.type === 'expense' ? '-' : '+'} {formatCurrency(t.amount)}
                    </span>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Tạo Phiếu Thu / Chi Quỹ
            </h3>

            <form onSubmit={handleCreateTransaction} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTxnType('expense')}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    txnType === 'expense'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Phiếu Chi Tiền
                </button>
                <button
                  type="button"
                  onClick={() => setTxnType('income')}
                  className={`py-2 rounded-xl text-xs font-bold ${
                    txnType === 'income'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  Phiếu Thu Tiền
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Danh mục
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                >
                  <option value="tien_da">Tiền mua đá bi</option>
                  <option value="nguyen_lieu_phu">Nguyên vật liệu pha chế phụ</option>
                  <option value="dien_nuoc">Tiền điện, nước, internet</option>
                  <option value="mat_bang">Tiền thuê mặt bằng</option>
                  <option value="khac">Khoản chi tiêu khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Số tiền (VNĐ) *
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  required
                  placeholder="VD: 50000"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-black text-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Diễn giải chi tiết *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Mua 5 bao đá bi ca sáng"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
                >
                  Lưu Phiếu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
