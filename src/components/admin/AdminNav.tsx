'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  LayoutGrid,
  UtensilsCrossed,
  History,
  WalletCards,
  Users,
} from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();

  const links = [
    { href: '/admin/dashboard', label: 'Tổng Quan', icon: LayoutDashboard },
    { href: '/admin/menu', label: 'Thực Đơn & Size', icon: UtensilsCrossed },
    { href: '/admin/orders', label: 'Lịch Sử Đơn', icon: History },
    { href: '/admin/cash-flow', label: 'Sổ Quỹ Thu Chi', icon: WalletCards },
    { href: '/admin/staff', label: 'Nhân Sự', icon: Users },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 border-b border-slate-200 dark:border-slate-800">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
              active
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

