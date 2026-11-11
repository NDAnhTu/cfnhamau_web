'use client';

import React from 'react';
import Link from 'next/link';
import { LayoutGrid, CheckCircle2, Clock } from 'lucide-react';

interface PosAdminTabsProps {
  activeTab: 'tables' | 'confirmations' | 'completed';
  occupiedCount?: number;
  unconfirmedCount?: number;
  completedCount?: number;
}

export function PosAdminTabs({
  activeTab,
  occupiedCount = 0,
  unconfirmedCount = 0,
  completedCount = 0,
}: PosAdminTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
        {/* TAB 1: SƠ ĐỒ BÀN */}
        {activeTab === 'tables' ? (
          <button
            type="button"
            className="px-3 sm:px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 bg-amber-600 text-white shadow-md shadow-amber-600/20"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Sơ Đồ Bàn Đang Phục Vụ</span>
            <span className="sm:hidden">Đang Phục Vụ</span>
            {occupiedCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {occupiedCount}
              </span>
            )}
          </button>
        ) : (
          <Link
            href="/pos"
            className="px-3 sm:px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Sơ Đồ Bàn Đang Phục Vụ</span>
            <span className="sm:hidden">Đang Phục Vụ</span>
            {occupiedCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                {occupiedCount}
              </span>
            )}
          </Link>
        )}

        {/* TAB 2: XÁC NHẬN THANH TOÁN (NẰM GIỮA) */}
        {activeTab === 'confirmations' ? (
          <button
            type="button"
            className="px-3 sm:px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 bg-amber-600 text-white shadow-md shadow-amber-600/20"
          >
            <Clock className="w-4 h-4" />
            <span>Xác Nhận Thanh Toán</span>
            {unconfirmedCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white">
                {unconfirmedCount}
              </span>
            )}
          </button>
        ) : (
          <Link
            href="/pos/confirmations"
            className="px-3 sm:px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600"
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Xác Nhận Thanh Toán</span>
            {unconfirmedCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white animate-pulse">
                {unconfirmedCount}
              </span>
            )}
          </Link>
        )}

        {/* TAB 3: BÀN ĐÃ THANH TOÁN */}
        {activeTab === 'completed' ? (
          <button
            type="button"
            className="px-3 sm:px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 bg-amber-600 text-white shadow-md shadow-amber-600/20"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Bàn Đã Thanh Toán</span>
            {completedCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black bg-white/25 text-white">
                {completedCount}
              </span>
            )}
          </button>
        ) : (
          <Link
            href="/pos/orders"
            className="px-3 sm:px-4 py-2 rounded-2xl font-black text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-600"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Bàn Đã Thanh Toán</span>
            {completedCount > 0 && (
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {completedCount}
              </span>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}

