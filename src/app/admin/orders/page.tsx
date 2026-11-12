'use client';

import React, { useState, useEffect } from 'react';
import { Order, Profile, OrderStatus, PaymentMethod } from '@/types/database';
import { DataService, isAwaitingPaymentConfirmation } from '@/lib/data-service';
import { formatCurrency, formatDateTime, parseOrderDate } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuth } from '@/context/AuthContext';
import * as XLSX from 'xlsx';
import {
  History,
  Download,
  Filter,
  Search,
  Eye,
  X,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
} from 'lucide-react';

export default function AdminOrdersPage() {
  const { user, isOwner } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  // Filters
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | '7days'>('all');
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine_in' | 'takeaway'>('all');
  const [searchCode, setSearchCode] = useState('');

  // Selected order details modal
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionBanner, setActionBanner] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    // Tự động lắng nghe thay đổi đơn hàng realtime
    const unsubscribe = DataService.subscribeToTablesAndOrders(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const loadData = async () => {
    const [allOrders, allProfiles] = await Promise.all([
      DataService.getOrders(),
      DataService.getProfiles(),
    ]);
    setOrders(allOrders);
    setProfiles(allProfiles);
  };

  const filteredOrders = orders.filter((o) => {
    // Search
    if (searchCode.trim() && !o.order_number.toLowerCase().includes(searchCode.toLowerCase().trim())) {
      return false;
    }
    // Staff
    if (staffFilter !== 'all' && o.created_by !== staffFilter) {
      return false;
    }
    // Payment method
    if (methodFilter !== 'all' && o.payment_method !== methodFilter) {
      return false;
    }
    // Status filter
    if (statusFilter !== 'all' && o.status !== statusFilter) {
      return false;
    }
    // Order type filter
    if (orderTypeFilter !== 'all' && o.order_type !== orderTypeFilter) {
      return false;
    }
    // Date filter
    if (dateFilter !== 'all') {
      const orderDate = parseOrderDate(o.created_at);
      const now = new Date();
      if (dateFilter === 'today') {
        const isToday =
          orderDate.getDate() === now.getDate() &&
          orderDate.getMonth() === now.getMonth() &&
          orderDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (dateFilter === '7days') {
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
    }
    return true;
  });

  const exportToExcel = () => {
    if (filteredOrders.length === 0) {
      alert('Không có dữ liệu đơn hàng để xuất!');
      return;
    }

    const exportRows: any[] = [];
    filteredOrders.forEach((o) => {
      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          exportRows.push({
            'Mã Đơn': o.order_number,
            'Thời Gian': formatDateTime(o.created_at),
            'Loại Đơn': o.order_type === 'dine_in' ? 'Tại bàn' : 'Mang về',
            'Bàn / Vị Trí': o.table_name || o.table?.name || (o.order_type === 'dine_in' ? 'Tại bàn' : 'Mang về'),
            'Tên Món': item.item_name,
            'Kích Cỡ': item.size_name || 'Tiêu chuẩn',
            'Đơn Giá (đ)': item.unit_price,
            'Số Lượng': item.quantity,
            'Thành Tiền Món (đ)': item.subtotal,
            'Tổng Đơn (đ)': o.final_amount,
            'Phương Thức': o.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR',
            'Trạng Thái': o.status === 'completed' ? 'Hoàn thành' : o.status === 'pending' ? 'Chờ làm' : 'Đã hủy',
            'Người Tạo': o.creator?.full_name || 'Nhân viên',
            'Người Thanh Toán': o.completer?.full_name || (o.status === 'completed' ? o.creator?.full_name : '') || '--',
            'Ghi Chú': item.notes || o.notes || '',
            'Lý Do Hủy': o.cancel_reason || '',
          });
        });
      } else {
        exportRows.push({
          'Mã Đơn': o.order_number,
          'Thời Gian': formatDateTime(o.created_at),
          'Loại Đơn': o.order_type === 'dine_in' ? 'Tại bàn' : 'Mang về',
          'Bàn / Vị Trí': o.table?.name || 'Mang về',
          'Tên Món': '--',
          'Kích Cỡ': '--',
          'Đơn Giá (đ)': 0,
          'Số Lượng': 0,
          'Thành Tiền Món (đ)': 0,
          'Tổng Đơn (đ)': o.final_amount,
          'Phương Thức': o.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR',
          'Trạng Thái': o.status === 'completed' ? 'Hoàn thành' : o.status === 'pending' ? 'Chờ làm' : 'Đã hủy',
          'Người Tạo': o.creator?.full_name || 'Nhân viên',
          'Người Thanh Toán': o.completer?.full_name || (o.status === 'completed' ? o.creator?.full_name : '') || '--',
          'Ghi Chú': o.notes || '',
          'Lý Do Hủy': o.cancel_reason || '',
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'LichSuDonHang');

    const fileName = `Bao_Cao_Don_Hang_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const totalFilteredAmount = filteredOrders
    .filter((o) => o.status === 'completed')
    .reduce((acc, o) => acc + o.final_amount, 0);

  const handleDeleteOrder = async (orderId: number) => {
    if (!viewingOrder) return;
    const confirmMsg = `Bạn có chắc chắn muốn xoá vĩnh viễn đơn hàng ${viewingOrder.order_number} (${formatCurrency(viewingOrder.final_amount)}) không?\n\nThao tác này sẽ xoá hoàn toàn đơn và các món liên quan khỏi hệ thống và không thể khôi phục!`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeleting(true);
    try {
      await DataService.deleteOrder(orderId);
      setActionBanner(`Đã xoá vĩnh viễn đơn hàng ${viewingOrder.order_number} thành công!`);
      setViewingOrder(null);
      await loadData();
      setTimeout(() => setActionBanner(null), 1000);
    } catch (err: any) {
      alert('Lỗi xoá đơn hàng: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
      <AdminNav />

      {/* Action Banner */}
      {actionBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionBanner}</span>
          </div>
          <button
            onClick={() => setActionBanner(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-6 h-6 text-amber-500" />
            <span>Lịch Sử Đơn Hàng & Tra Cứu Chi Tiết</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Xem lại chính xác từng dòng sản phẩm, giá bán thời điểm order và trích xuất Excel
          </p>
        </div>

        <button
          onClick={exportToExcel}
          className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Xuất Báo Cáo Excel (.xlsx)</span>
        </button>
      </div>

      {/* Multipurpose Filter Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {/* Search code */}
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Mã đơn</label>
            <input
              type="text"
              placeholder="#1001..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
            />
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Thời gian</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="7days">7 ngày qua</option>
            </select>
          </div>

          {/* Staff */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Nhân viên đứng ca</label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">Tất cả nhân viên</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Loại đơn</label>
            <select
              value={orderTypeFilter}
              onChange={(e) => setOrderTypeFilter(e.target.value as any)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">Tất cả loại đơn</option>
              <option value="dine_in">Tại bàn</option>
              <option value="takeaway">Mang về</option>
            </select>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Thanh toán</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="cash">Tiền mặt</option>
              <option value="vietqr">VietQR chuyển khoản</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Trạng thái</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-semibold"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="completed">Thanh toán</option>
              <option value="pending">Chưa thanh toán</option>
            </select>
          </div>
        </div>

        {/* Filter Summary */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-xs">
          <span className="text-slate-400">
            Tìm thấy <strong className="text-slate-800 dark:text-white">{filteredOrders.length}</strong> đơn hàng phù hợp
          </span>
          <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
            Tổng: {formatCurrency(totalFilteredAmount)}
          </span>
        </div>
      </div>

      {/* Orders List: Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200 dark:border-slate-700">
            Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredOrders.map((o) => (
            <div
              key={o.id}
              onClick={() => setViewingOrder(o)}
              className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 active:scale-[0.99] transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 dark:text-white text-base">
                    {o.order_type === 'dine_in' ? o.table_name || o.table?.name || 'Tại bàn' : 'Mang về'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                    {o.order_number}
                  </span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    o.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : o.status === 'pending'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {o.status === 'completed'
                    ? 'Thanh toán'
                    : o.status === 'pending'
                    ? 'Chưa thanh toán'
                    : 'Đã hủy'}
                </span>
              </div>

              {/* Items summary */}
              <div className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-750">
                {o.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ') || 'Không có món'}
              </div>

              {/* Bottom row: Time, Staff, Amount & Payment */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">{formatDateTime(o.created_at)}</span>
                  <span className="text-slate-500 text-[11px]">Tạo: {o.creator?.full_name || 'Nhân viên'}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-amber-600 dark:text-amber-400 text-sm block">
                    {formatCurrency(o.final_amount)}
                  </span>
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      o.payment_method === 'cash'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                    }`}
                  >
                    {o.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Orders Table (Desktop: hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-850 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Bàn & Mã đơn</th>
                <th className="py-3 px-3">Thời gian tạo</th>
                <th className="py-3 px-3">Người tạo & Thu ngân</th>
                <th className="py-3 px-3">Món trong đơn</th>
                <th className="py-3 px-3">Thanh toán</th>
                <th className="py-3 px-3 text-right">Tổng tiền</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredOrders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => setViewingOrder(o)}
                  className="hover:bg-amber-50/50 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <span className="font-black text-slate-900 dark:text-white text-sm block">
                      {o.order_type === 'dine_in' ? o.table_name || o.table?.name || 'Tại bàn' : 'Mang đi'}
                    </span>
                    <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                      {o.order_number}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-500">
                    {formatDateTime(o.created_at)}
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Tạo: {o.creator?.full_name || 'Nhân viên'}
                    </span>
                    {o.completer ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold block">
                        Thu: {o.completer.full_name}
                      </span>
                    ) : o.status === 'completed' ? (
                      <span className="text-[10px] text-slate-400 block">
                        Thu: {o.creator?.full_name?.split(' ').pop()}
                      </span>
                    ) : null}
                  </td>

                  <td className="py-3 px-3 max-w-[200px]">
                    <span className="line-clamp-1 text-slate-600 dark:text-slate-300 font-medium">
                      {o.items?.map((i) => `${i.quantity}x ${i.item_name}`).join(', ') || '--'}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.payment_method === 'cash'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}
                    >
                      {o.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR'}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-right font-black text-amber-600 dark:text-amber-400 text-sm">
                    {formatCurrency(o.final_amount)}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        o.status === 'completed'
                          ? isAwaitingPaymentConfirmation(o)
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : o.status === 'pending'
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {o.status === 'completed'
                        ? isAwaitingPaymentConfirmation(o)
                          ? 'Chờ xác nhận tiền'
                          : 'Thanh toán'
                        : o.status === 'pending'
                        ? 'Chưa thanh toán'
                        : 'Đã hủy'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setViewingOrder(o)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      title="Xem chi tiết hóa đơn"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
      {viewingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {viewingOrder.order_type === 'dine_in'
                      ? viewingOrder.table_name || viewingOrder.table?.name || 'Tại bàn'
                      : 'Mang về (Takeaway)'}
                  </h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    {viewingOrder.order_number}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Thời gian tạo: {formatDateTime(viewingOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setViewingOrder(null)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-750">
              <div>
                <span className="text-slate-400 block">Nhân viên tạo:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {viewingOrder.creator?.full_name || 'Nhân viên'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Người thanh toán:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {viewingOrder.completer?.full_name || (viewingOrder.status === 'completed' ? viewingOrder.creator?.full_name : '--')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Vị trí phục vụ:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {viewingOrder.order_type === 'dine_in'
                    ? viewingOrder.table_name || viewingOrder.table?.name || 'Tại bàn'
                    : 'Mang đi'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Phương thức thanh toán:</span>
                <span className="font-bold text-slate-800 dark:text-white">
                  {viewingOrder.payment_method === 'cash' ? 'Tiền mặt' : 'VietQR chuyển khoản'}
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {viewingOrder.items?.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-900 flex justify-between items-center text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-white">
                      {item.quantity}x {item.item_name}
                    </span>
                    {item.size_name && (
                      <span className="text-[11px] text-amber-600 block">
                        Size: {item.size_name}
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-[11px] text-slate-400 italic block">
                        Ghi chú: {item.notes}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block">
                      Đơn giá: {formatCurrency(item.unit_price)}
                    </span>
                    <span className="font-black text-slate-800 dark:text-white">
                      {formatCurrency(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {viewingOrder.status === 'cancelled' && viewingOrder.cancel_reason && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
                <strong>Lý do hủy đơn:</strong> {viewingOrder.cancel_reason}
              </div>
            )}

            {/* Total */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Tổng thực thu hóa đơn:
              </span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                {formatCurrency(viewingOrder.final_amount)}
              </span>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {isAwaitingPaymentConfirmation(viewingOrder) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await DataService.confirmOrderPayment(viewingOrder.id);
                      setViewingOrder(null);
                      await loadData();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Đã nhận được tiền</span>
                  </button>
                )}

                {viewingOrder.status === 'pending' && !isAwaitingPaymentConfirmation(viewingOrder) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await DataService.updateOrderStatus(viewingOrder.id, 'completed', undefined, undefined, user?.id);
                      setViewingOrder(null);
                      await loadData();
                    }}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Hoàn tất thanh toán</span>
                  </button>
                )}

                {Boolean(isOwner || user?.role === 'owner') && (
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => handleDeleteOrder(viewingOrder.id)}
                    className="px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 font-bold text-xs hover:bg-rose-100 dark:hover:bg-rose-900/40 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                    title="Xoá vĩnh viễn đơn hàng này khỏi hệ thống (Chỉ dành riêng cho Admin/Chủ quán)"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{isDeleting ? 'Đang xoá...' : 'Xoá Đơn Hàng'}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setViewingOrder(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

