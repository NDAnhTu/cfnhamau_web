'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, Lock, ShoppingBag, ArrowLeft, KeyRound } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isOwner, loading, isCloud } = useAuth();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400">Đang kiểm tra quyền hạn...</p>
        </div>
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
                ? `Tài khoản hiện tại (${user.full_name} - Nhân viên) không có quyền truy cập khu vực Quản trị. Trang này chỉ dành cho Chủ Quán (Owner).`
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

  return <>{children}</>;
}

