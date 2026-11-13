'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Coffee,
  ShoppingBag,
  WalletCards,
  LayoutDashboard,
  Moon,
  Sun,
  User,
  ChevronDown,
  Database,
  LogOut,
  Receipt,
  Calendar,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, isOwner, isStaff, isCloud, logout } = useAuth();
  const { selectedDate, isToday, setSelectedDate, resetToToday, goToPreviousDay, displayDate } = useDateFilter();

  const [userDropdown, setUserDropdown] = useState(false);
  const [dateDropdown, setDateDropdown] = useState(false);

  const isAuthPage = ['/staffs', '/dmcs', '/login'].includes(pathname);

  // 3 Main Tabs for Manager / Admin: Text label ONLY displays when selected
  const navTabs = [
    {
      href: '/pos',
      label: 'Đặt Món',
      shortLabel: 'POS',
      icon: ShoppingBag,
      active: pathname === '/pos' || pathname === '/pos/orders',
    },
    {
      href: '/shift',
      label: 'Chi Tiêu',
      shortLabel: 'Chi Tiêu',
      icon: WalletCards,
      active: pathname === '/shift',
    },
    ...(!isStaff
      ? [
          {
            href: '/admin/dashboard',
            label: 'Quản Lý',
            shortLabel: 'Quản Lý',
            icon: LayoutDashboard,
            active: pathname.startsWith('/admin'),
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    setUserDropdown(false);
    router.push('/staffs');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-1 sm:gap-2">
        {/* Brand & Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="hidden md:block">
              <span className="font-bold text-slate-800 dark:text-white text-sm sm:text-base tracking-tight leading-none block">
                Cà Phê Nhà Mẫu
              </span>
            </div>
          </Link>
        </div>

        {/* Center Navigation Links: ONLY visible when logged in, NOT staff, and NOT on login pages */}
        {user && !isAuthPage && !isStaff && (
          <nav className="flex items-center gap-1 sm:gap-1.5">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  title={tab.label}
                  className={`flex items-center gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm transition-all ${
                    tab.active
                      ? 'px-2.5 sm:px-3 py-1.5 bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/20'
                      : 'p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.active && (
                    <>
                      <span className="whitespace-nowrap hidden sm:inline">{tab.label}</span>
                      <span className="whitespace-nowrap sm:hidden">{tab.shortLabel}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right Action Icons: Date Picker, Dark mode & Auth Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Interactive Date Filter Button: ONLY visible when logged in, NOT staff, and NOT on login pages */}
          {user && !isAuthPage && !isStaff && (
            <div className="relative">
              <button
                onClick={() => setDateDropdown(!dateDropdown)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                  isToday
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400'
                    : 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-sm'
                }`}
                title="Nhấn để chọn xem ngày khác"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="hidden sm:inline truncate max-w-[110px]">{displayDate}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
              </button>

              {dateDropdown && (
                <div
                  className="absolute right-0 mt-2 w-64 p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 text-xs space-y-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-white">Xem Số Liệu Theo Ngày</span>
                    {!isToday && (
                      <button
                        onClick={() => {
                          resetToToday();
                          setDateDropdown(false);
                        }}
                        className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                      >
                        Về Hôm Nay
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Chọn ngày xem:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                          setDateDropdown(false);
                        }
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        goToPreviousDay();
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all"
                      title="Lùi lại 1 ngày so với ngày đang chọn"
                    >
                      Hôm qua
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetToToday();
                        setDateDropdown(false);
                      }}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] transition-all ${
                        isToday
                          ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/30'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100'
                      }`}
                    >
                      Hôm nay
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dark mode button */}
          <button
            onClick={toggleTheme}
            aria-label="Đổi giao diện"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {user ? (
            /* User profile dropdown */
            <div className="relative">
              <button
                onClick={() => setUserDropdown(!userDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors"
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    isOwner ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                >
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 hidden lg:inline max-w-[100px] truncate">
                  {user.full_name}
                </span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {userDropdown && (
                <div
                  className="absolute right-0 mt-2 w-56 py-2 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 text-xs"
                  onClick={() => setUserDropdown(false)}
                >
                  <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-700">
                    <p className="font-bold text-slate-900 dark:text-white truncate">
                      {user.full_name}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      {isOwner ? 'Chủ quán' : 'Nhân viên'}
                    </p>
                  </div>

                  <div className="p-1">
                    {isOwner && (
                      <Link
                        href="/admin/dashboard"
                        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl flex items-center gap-2"
                      >
                        <LayoutDashboard className="w-4 h-4 text-amber-500" />
                        <span>Trang Quản Trị</span>
                      </Link>
                    )}

                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl flex items-center gap-2 font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng Xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Logged out button */
            <Link
              href="/staffs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-sm transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
