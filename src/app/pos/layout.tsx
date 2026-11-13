'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Trong lúc đang kiểm tra phiên làm việc (1-2s đầu tiên khi mở app), hiển thị màn hình chờ nạp
  if (loading) {
    return (
      <div className="flex-1 min-h-[70vh] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
          Đang nạp phiên làm việc...
        </span>
      </div>
    );
  }

  // Nếu đã nạp xong mà không có người dùng, trả về null để router.replace('/login') thực hiện chuyển hướng
  if (!user) {
    return null;
  }

  return <>{children}</>;
}

