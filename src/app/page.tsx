'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/pos');
      } else {
        router.replace('/staffs');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs font-bold text-slate-400 animate-pulse">
        Đang chuyển tiếp vào hệ thống...
      </span>
    </div>
  );
}
