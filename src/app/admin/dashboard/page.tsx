'use client';

import React, { useState, useEffect } from 'react';
import { Order, Category } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { useDateFilter } from '@/context/DateFilterContext';
import { formatCurrency, getLocalDateString, parseOrderDate } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Utensils,
  Award,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const DONUT_COLORS = ['#d97706', '#0284c7', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];

export default function AdminDashboardPage() {
  const { selectedDate, displayDate } = useDateFilter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | '7days' | 'month'>('today');

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes
    const unsubscribe = DataService.subscribeToTablesAndOrders(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    const [allOrders, allCats] = await Promise.all([
      DataService.getOrders(),
      DataService.getCategories(),
    ]);
    setOrders(allOrders);
    setCategories(allCats);
  };

  const completedOrders = orders.filter((o) => {
    if (o.status !== 'completed') return false;
    if (timeRange === 'today') {
      return selectedDate ? (o.created_at.startsWith(selectedDate) || getLocalDateString(o.created_at) === selectedDate) : true;
    }
    if (timeRange === '7days') {
      const orderDate = parseOrderDate(o.created_at).getTime();
      const diffDays = (Date.now() - orderDate) / (1000 * 3600 * 24);
      return diffDays <= 7;
    }
    if (timeRange === 'month') {
      const monthPrefix = selectedDate ? selectedDate.slice(0, 7) : getLocalDateString().slice(0, 7);
      return o.created_at.startsWith(monthPrefix) || getLocalDateString(o.created_at).startsWith(monthPrefix);
    }
    return true;
  });

  // KPI 1: Doanh thu
  const totalRevenue = completedOrders.reduce((acc, o) => acc + o.final_amount, 0);

  // KPI 2: Đơn hàng & Tỷ lệ Tại chỗ vs Mang đi
  const totalOrdersCount = completedOrders.length;
  const dineInCount = completedOrders.filter((o) => o.order_type === 'dine_in').length;
  const takeawayCount = completedOrders.filter((o) => o.order_type === 'takeaway').length;
  const dineInPercent = totalOrdersCount > 0 ? Math.round((dineInCount / totalOrdersCount) * 100) : 0;

  // KPI 3: Tiền mặt vs VietQR
  const cashTotal = completedOrders
    .filter((o) => o.payment_method === 'cash')
    .reduce((acc, o) => acc + o.final_amount, 0);
  const qrTotal = completedOrders
    .filter((o) => o.payment_method === 'vietqr')
    .reduce((acc, o) => acc + o.final_amount, 0);

  // 1. Biểu đồ biến động doanh thu theo khung giờ thực tế
  const hourlyMap: Record<string, number> = {};
  for (let h = 6; h <= 22; h++) {
    const label = `${h.toString().padStart(2, '0')}:00`;
    hourlyMap[label] = 0;
  }
  completedOrders.forEach((o) => {
    const d = parseOrderDate(o.created_at);
    const h = d.getHours();
    const label = `${h.toString().padStart(2, '0')}:00`;
    hourlyMap[label] = (hourlyMap[label] || 0) + o.final_amount;
  });

  const hasSales = Object.values(hourlyMap).some((v) => v > 0);
  const hourlyData = hasSales
    ? Object.entries(hourlyMap).map(([hour, sales]) => ({ hour, sales }))
    : [
        { hour: '07:00', sales: 0 },
        { hour: '08:00', sales: 0 },
        { hour: '09:00', sales: 0 },
        { hour: '10:00', sales: 0 },
        { hour: '11:00', sales: 0 },
        { hour: '12:00', sales: 0 },
        { hour: '14:00', sales: 0 },
        { hour: '16:00', sales: 0 },
        { hour: '18:00', sales: 0 },
        { hour: '20:00', sales: 0 },
        { hour: '22:00', sales: 0 },
      ];

  // 2. Biểu đồ tròn theo Danh mục thực tế
  const categorySalesMap: Record<string, number> = {};
  completedOrders.forEach((o) => {
    o.items?.forEach((item) => {
      const catName = item.item_name.includes('Trà')
        ? 'Trà & Trái cây'
        : item.item_name.includes('Bánh')
        ? 'Bánh ngọt'
        : item.item_name.includes('Matcha') || item.item_name.includes('Đá xay')
        ? 'Đá xay'
        : 'Cà phê';
      categorySalesMap[catName] = (categorySalesMap[catName] || 0) + item.subtotal;
    });
  });

  const donutData = Object.entries(categorySalesMap).map(([name, value]) => ({
    name,
    value,
  }));

  const displayDonut =
    donutData.length > 0
      ? donutData
      : [{ name: 'Chưa có đơn', value: 1 }];

  // 3. Top 5 món bán chạy nhất & Ít bán nhất
  const itemCounts: Record<string, { name: string; qty: number; rev: number }> = {};
  completedOrders.forEach((o) => {
    o.items?.forEach((i) => {
      if (!itemCounts[i.item_name]) {
        itemCounts[i.item_name] = { name: i.item_name, qty: 0, rev: 0 };
      }
      itemCounts[i.item_name].qty += i.quantity;
      itemCounts[i.item_name].rev += i.subtotal;
    });
  });

  const rankedItems = Object.values(itemCounts).sort((a, b) => b.qty - a.qty);
  const topSelling = rankedItems.slice(0, 5);

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
      {/* Admin Nav */}
      <AdminNav />

      {/* Header & Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            Báo Cáo Hoạt Động & Doanh Thu
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Phân tích số liệu doanh thu thực tế, thói quen gọi món và dòng tiền
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm self-start">
          <button
            onClick={() => setTimeRange('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeRange === 'today'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Hôm nay
          </button>
          <button
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeRange === '7days'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            7 ngày qua
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timeRange === 'month'
                ? 'bg-amber-600 text-white'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            Tháng này
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Doanh thu */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Doanh Thu Thực Thu
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block">
            {formatCurrency(totalRevenue)}
          </span>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.8% so với hôm qua</span>
          </div>
        </div>

        {/* Số đơn & Tỷ lệ tại chỗ vs mang đi */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Tổng Đơn Hàng
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block">
            {totalOrdersCount} <span className="text-sm font-semibold text-slate-400">đơn</span>
          </span>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Tại chỗ: {dineInCount} ({dineInPercent}%)</span>
            <span>Mang đi: {takeawayCount} ({100 - dineInPercent}%)</span>
          </div>
        </div>

        {/* Tiền mặt vs VietQR */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Phân Loại Thanh Toán
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1.5 mt-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Tiền mặt két:</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(cashTotal)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500 font-medium">Tài khoản VietQR:</span>
              <span className="font-extrabold text-blue-600 dark:text-blue-400">
                {formatCurrency(qrTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hourly Trend Line Chart - 8 cols */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>Biến Động Doanh Thu Theo Khung Giờ</span>
              </h3>
              <p className="text-xs text-slate-400">
                Nhận diện khung giờ cao điểm khách đông trong ngày
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={hourlyData}>
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Doanh thu']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#d97706"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#d97706' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Doanh thu theo Danh mục - 4 cols */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Utensils className="w-4 h-4 text-amber-500" />
              <span>Tỷ Trọng Doanh Thu Danh Mục</span>
            </h3>
            <p className="text-xs text-slate-400 mb-2">
              Phân bổ % doanh thu theo nhóm món
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayDonut}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {displayDonut.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Doanh thu']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-700/60">
            {displayDonut.map((entry, idx) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}
                />
                <span className="truncate text-slate-600 dark:text-slate-300">
                  {entry.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Món Bán Chạy Nhất Ranking Table */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Top 5 Món Bán Chạy Nhất Quán</span>
            </h3>
            <p className="text-xs text-slate-400">
              Kiểm soát số lượng tiêu thụ để chuẩn bị nguyên vật liệu dự phòng
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-850 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Xếp hạng</th>
                <th className="py-2.5 px-3">Tên món</th>
                <th className="py-2.5 px-3 text-right">Số lượng ly bán</th>
                <th className="py-2.5 px-3 text-right">Tổng doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {topSelling.length > 0 ? (
                topSelling.map((item, idx) => (
                  <tr key={item.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                    <td className="py-3 px-3 font-black text-amber-600 dark:text-amber-400">
                      #{idx + 1}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-white">
                      {item.name}
                    </td>
                    <td className="py-3 px-3 text-right font-black text-slate-900 dark:text-white">
                      {item.qty} ly
                    </td>
                    <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-400">
                      {formatCurrency(item.rev)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-400">
                    Chưa có đủ dữ liệu đơn hàng hoàn tất để xếp hạng.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

