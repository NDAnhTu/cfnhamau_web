'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowDown } from 'lucide-react';
import { refreshSupabaseSession, reconnectRealtimeIfDisconnected } from '@/lib/supabase/client';

export function PullToRefresh() {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [readyToRefresh, setReadyToRefresh] = useState(false);

  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);

  isRefreshingRef.current = isRefreshing;

  const checkScrollableParent = useCallback((target: EventTarget | null): boolean => {
    if (!(target instanceof HTMLElement)) return false;
    let el: HTMLElement | null = target;
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollTop > 0) return true;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
      el = el.parentElement;
    }
    return false;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (e.touches.length !== 1) return;

      // Chỉ kích hoạt khi đang ở đỉnh trang
      const isAtTop = window.scrollY <= 0 && document.documentElement.scrollTop <= 0;
      if (!isAtTop) return;

      // Không kích hoạt nếu đang thao tác bên trong phần tử cuộn con hoặc input
      if (checkScrollableParent(e.target)) return;

      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    },
    [checkScrollableParent]
  );

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current || startYRef.current === null || isRefreshingRef.current) return;

    const currentY = e.touches[0].clientY;
    const diffY = currentY - startYRef.current;

    // Chỉ xử lý khi vuốt từ trên xuống
    if (diffY <= 0) {
      setPullDistance(0);
      setReadyToRefresh(false);
      return;
    }

    // Kiểm tra lại vị trí cuộn trang
    if (window.scrollY > 0 || document.documentElement.scrollTop > 0) {
      isPullingRef.current = false;
      setPullDistance(0);
      setReadyToRefresh(false);
      return;
    }

    // Áp dụng lực cản tự nhiên (damping curve)
    const dampedDistance = Math.min(Math.pow(diffY, 0.82) * 1.6, 75);
    setPullDistance(dampedDistance);
    setReadyToRefresh(dampedDistance >= 48);
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || startYRef.current === null) return;
    isPullingRef.current = false;
    startYRef.current = null;

    if (readyToRefresh && !isRefreshingRef.current) {
      setIsRefreshing(true);
      setPullDistance(52); // Giữ vị trí hiển thị spinner trong lúc làm mới

      try {
        await Promise.allSettled([
          refreshSupabaseSession(),
          new Promise((resolve) => setTimeout(resolve, 600)),
        ]);
        reconnectRealtimeIfDisconnected();

        // Gửi sự kiện cho các trang lắng nghe làm mới dữ liệu
        const event = new CustomEvent('app:pull-to-refresh', { cancelable: true });
        const wasHandled = !window.dispatchEvent(event);

        if (!wasHandled) {
          router.refresh();
        }
      } catch (err) {
        console.warn('Lỗi làm mới dữ liệu:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
        setReadyToRefresh(false);
      }
    } else {
      setPullDistance(0);
      setReadyToRefresh(false);
    }
  }, [readyToRefresh, router]);

  useEffect(() => {
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (pullDistance <= 0 && !isRefreshing) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-200 ease-out"
      style={{
        transform: `translateY(${pullDistance}px)`,
        opacity: pullDistance > 12 || isRefreshing ? 1 : 0,
      }}
    >
      <div className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200/90 dark:border-slate-700 flex items-center justify-center text-amber-600 dark:text-amber-400">
        {isRefreshing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <ArrowDown
            className="w-5 h-5 transition-transform duration-150"
            style={{
              transform: `rotate(${readyToRefresh ? 180 : Math.min((pullDistance / 48) * 180, 180)}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}

