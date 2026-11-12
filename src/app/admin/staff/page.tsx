'use client';

import React, { useState, useEffect } from 'react';
import { Profile, UserRole, Order, Shift } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserPlus,
  ShieldCheck,
  User,
  Phone,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  X,
  Edit,
  Trash2,
  Eye,
  ShoppingBag,
  DollarSign,
  Clock,
  Key,
  Mail,
} from 'lucide-react';

export default function AdminStaffPage() {
  const { user: currentUser } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);

  // New staff form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Edit staff form state
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('staff');
  const [editPassword, setEditPassword] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const [list, ordersList, shiftsList] = await Promise.all([
        DataService.getProfiles(),
        DataService.getOrders(),
        DataService.getShifts(),
      ]);
      setProfiles(list);
      setOrders(ordersList);
      setShifts(shiftsList);
    } catch (e) {
      console.warn('Lỗi tải danh sách nhân sự:', e);
    }
  };

  const handleOpenStaffDetail = (profile: Profile) => {
    setSelectedStaff(profile);
    setEditFullName(profile.full_name);
    setEditEmail(profile.email || '');
    setEditPhone(profile.phone || '');
    setEditRole(profile.role);
    setEditPassword('');
    setEditIsActive(profile.is_active);
    setEditMsg(null);
  };

  const handleSaveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setEditLoading(true);
    setEditMsg(null);

    try {
      const updates: any = {
        full_name: editFullName.trim(),
        email: editEmail.trim().toLowerCase(),
        phone: editPhone.trim() || null,
        role: editRole,
        is_active: editIsActive,
      };
      if (editPassword.trim()) {
        updates.password = editPassword.trim();
      }

      const updated = await DataService.updateProfile(selectedStaff.id, updates);
      setSelectedStaff(updated);
      setEditMsg({ text: 'Cập nhật thông tin nhân sự thành công!', type: 'success' });
      await loadStaff();
    } catch (err: any) {
      setEditMsg({ text: err.message || 'Lỗi khi cập nhật nhân sự', type: 'error' });
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteStaff = async (profileId: string, profileName: string) => {
    if (currentUser && currentUser.id === profileId) {
      alert('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn nhân sự "${profileName}"?\nHành động này không thể hoàn tác!`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await DataService.deleteProfile(profileId);
      if (selectedStaff?.id === profileId) {
        setSelectedStaff(null);
      }
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa nhân sự');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (profileId: string) => {
    if (currentUser && currentUser.id === profileId) {
      alert('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }
    if (confirm('Bạn có chắc muốn đổi trạng thái kích hoạt của tài khoản này?')) {
      await DataService.toggleProfileActive(profileId);
      await loadStaff();
      if (selectedStaff && selectedStaff.id === profileId) {
        setSelectedStaff((prev) => (prev ? { ...prev, is_active: !prev.is_active } : null));
        setEditIsActive((prev) => !prev);
      }
    }
  };

  const handleToggleActiveInModal = async () => {
    if (!selectedStaff) return;
    if (currentUser && currentUser.id === selectedStaff.id && selectedStaff.is_active) {
      alert('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }
    try {
      const newStatus = !selectedStaff.is_active;
      const updated = await DataService.updateProfile(selectedStaff.id, { is_active: newStatus });
      setSelectedStaff(updated);
      setEditIsActive(newStatus);
      await loadStaff();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đổi trạng thái');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim() || null;
      const cleanPass = password.trim() || '123456';

      await DataService.createProfile({
        id: crypto.randomUUID(),
        full_name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        role,
        phone: cleanPhone,
        is_active: true,
      });

      setMsg({
        text: `Đã thêm tài khoản cho ${cleanName} (${role === 'owner' ? 'Quản lý' : 'Nhân viên'}) thành công!`,
        type: 'success',
      });
      setFullName('');
      setEmail('');
      setPassword('123456');
      setPhone('');
      await loadStaff();
      setTimeout(() => {
        setIsModalOpen(false);
        setMsg(null);
      }, 1500);
    } catch (err: any) {
      setMsg({ text: err.message || 'Lỗi khi thêm nhân viên', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>Quản Lý Nhân Sự & Phân Quyền</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Bấm vào bất kỳ nhân viên nào để xem chi tiết, thống kê, chỉnh sửa thông tin hoặc xóa tài khoản
          </p>
        </div>

        <button
          onClick={() => {
            setMsg(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/30 flex items-center gap-2 transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Thêm Tài Khoản Mới</span>
        </button>
      </div>

      {/* Mobile Card View (< md) */}
      <div className="md:hidden space-y-3">
        {profiles.map((p) => (
          <div
            key={p.id}
            onClick={() => handleOpenStaffDetail(p)}
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3 cursor-pointer hover:border-amber-500/80 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold ${
                    p.role === 'owner' ? 'bg-indigo-600' : 'bg-emerald-600'
                  }`}
                >
                  {p.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    {p.full_name}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {p.email || `ID: ${p.id.slice(0, 8)}...`}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  p.is_active
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {p.is_active ? 'Đang làm việc' : 'Đã khóa'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-700/60">
              <div>
                <span className="text-slate-400 block text-[10px]">Vai trò:</span>
                <span
                  className={`inline-flex items-center gap-1 font-bold ${
                    p.role === 'owner'
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {p.role === 'owner' ? 'Chủ quán (Owner)' : 'Nhân viên (Staff)'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">SĐT:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {p.phone || '--'}
                </span>
              </div>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 gap-1.5">
              <span className="text-[11px] text-slate-400">
                Tạo: {formatDateTime(p.created_at)}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenStaffDetail(p);
                  }}
                  className="px-2.5 py-1 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(p.id);
                  }}
                  className={`p-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center ${
                    p.is_active
                      ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
                      : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
                  }`}
                  title={p.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                >
                  {p.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStaff(p.id, p.full_name);
                  }}
                  className="p-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60"
                  title="Xóa nhân sự"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff List Table (Desktop: hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-850 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-3">Vai trò phân quyền</th>
                <th className="py-3 px-3">Số điện thoại</th>
                <th className="py-3 px-3">Ngày tạo tài khoản</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {profiles.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => handleOpenStaffDetail(p)}
                  className="hover:bg-amber-50/40 dark:hover:bg-slate-750 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          p.role === 'owner' ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}
                      >
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {p.full_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.email || `ID: ${p.id.slice(0, 10)}...`}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        p.role === 'owner'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {p.role === 'owner' ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Chủ quán (Owner)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Nhân viên (Staff)</span>
                        </>
                      )}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-medium">
                    {p.phone || '--'}
                  </td>

                  <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                    {formatDateTime(p.created_at)}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {p.is_active ? 'Đang làm việc' : 'Đã khóa'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStaffDetail(p);
                        }}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800 transition-colors inline-flex items-center gap-1"
                        title="Xem chi tiết & Chỉnh sửa"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Chi tiết</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleActive(p.id);
                        }}
                        className={`p-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center ${
                          p.is_active
                            ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
                        }`}
                        title={p.is_active ? 'Khóa tài khoản' : 'Mở khóa'}
                      >
                        {p.is_active ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteStaff(p.id, p.full_name);
                        }}
                        className="p-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 transition-colors"
                        title="Xóa nhân sự"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* STAFF DETAIL & EDIT MODAL */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-5 my-auto max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-700/80 pb-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black shadow-md ${
                    selectedStaff.role === 'owner'
                      ? 'bg-indigo-600 shadow-indigo-600/30'
                      : 'bg-emerald-600 shadow-emerald-600/30'
                  }`}
                >
                  {selectedStaff.full_name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-lg sm:text-xl text-slate-900 dark:text-white leading-tight">
                    {selectedStaff.full_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedStaff.role === 'owner'
                          ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {selectedStaff.role === 'owner' ? (
                        <>
                          <ShieldCheck className="w-3 h-3 text-indigo-500" />
                          <span>Chủ quán (Owner)</span>
                        </>
                      ) : (
                        <>
                          <User className="w-3 h-3 text-emerald-500" />
                          <span>Nhân viên (Staff)</span>
                        </>
                      )}
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        selectedStaff.is_active
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {selectedStaff.is_active ? 'Đang làm việc' : 'Đã khóa'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStaff(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick stats grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-750/70 border border-slate-100 dark:border-slate-700/60 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 mb-0.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                  <span>Đơn đã tạo</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                  {orders.filter((o) => o.created_by === selectedStaff.id).length}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-750/70 border border-slate-100 dark:border-slate-700/60 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 mb-0.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Doanh thu tạo</span>
                </div>
                <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 truncate">
                  {formatCurrency(
                    orders
                      .filter((o) => o.created_by === selectedStaff.id && o.status === 'completed')
                      .reduce((sum, o) => sum + (o.final_amount || 0), 0)
                  )}
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-750/70 border border-slate-100 dark:border-slate-700/60 text-center">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-400 mb-0.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span>Ca đã trực</span>
                </div>
                <div className="text-base sm:text-lg font-black text-slate-800 dark:text-white">
                  {shifts.filter((s) => s.staff_id === selectedStaff.id).length}
                </div>
              </div>
            </div>

            {/* Notification message */}
            {editMsg && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  editMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {editMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{editMsg.text}</span>
              </div>
            )}

            {/* Edit form */}
            <form onSubmit={handleSaveStaffEdit} className="space-y-3.5 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5 text-amber-500" />
                <span>Chỉnh sửa thông tin nhân sự</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    placeholder="VD: 0912345678"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Email đăng nhập *
                  </label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Vai trò phân quyền *
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="staff">Nhân viên (Chỉ mở POS, ca làm việc)</option>
                    <option value="owner">Chủ quán (Toàn quyền quản trị & doanh thu)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Đổi mật khẩu mới (Tùy chọn)
                  </label>
                  <input
                    type="password"
                    placeholder="Để trống nếu không đổi..."
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 dark:text-slate-300 mb-1">
                    Trạng thái tài khoản
                  </label>
                  <select
                    value={editIsActive ? 'active' : 'locked'}
                    onChange={(e) => setEditIsActive(e.target.value === 'active')}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="active">Đang làm việc (Hoạt động)</option>
                    <option value="locked">Đã khóa (Không thể đăng nhập)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-400">
                  Ngày tạo: {formatDateTime(selectedStaff.created_at)}
                </span>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {editLoading ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>

            {/* Quick Actions Bar on Staff Data */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Hành động dữ liệu nhân sự:
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleToggleActiveInModal}
                  className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 border ${
                    selectedStaff.is_active
                      ? 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                      : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {selectedStaff.is_active ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Khóa tài khoản này</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Mở khóa tài khoản</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteStaff(selectedStaff.id, selectedStaff.full_name)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-bold text-xs transition-all inline-flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Xóa Nhân Sự Này</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <span>Thêm Tài Khoản Nhân Viên Mới</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {msg && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
                  msg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}
              >
                {msg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{msg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trần Thị B"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien@quan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Mật khẩu tạm thời *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="0912345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold uppercase text-slate-500 mb-1">Vai trò phân quyền *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold"
                >
                  <option value="staff">Nhân viên (Chỉ mở POS, ca làm việc)</option>
                  <option value="owner">Chủ quán (Toàn quyền quản trị & doanh thu)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 disabled:opacity-50"
                >
                  {loading ? 'Đang tạo...' : 'Tạo Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
