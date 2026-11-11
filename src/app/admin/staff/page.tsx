'use client';

import React, { useState, useEffect } from 'react';
import { Profile, UserRole } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { formatDateTime } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
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
} from 'lucide-react';

export default function AdminStaffPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New staff form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('123456');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    const list = await DataService.getProfiles();
    setProfiles(list);
  };

  const handleToggleActive = async (profileId: string) => {
    if (confirm('Bạn có chắc muốn đổi trạng thái kích hoạt của tài khoản này?')) {
      await DataService.toggleProfileActive(profileId);
      loadStaff();
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
            Thêm tài khoản nhân viên, thiết lập vai trò (Owner / Staff) và khóa tài khoản khi nghỉ việc
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
            className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3"
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

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60">
              <span className="text-[11px] text-slate-400">
                Tạo: {formatDateTime(p.created_at)}
              </span>
              <button
                onClick={() => handleToggleActive(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                  p.is_active
                    ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
                    : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
                }`}
              >
                {p.is_active ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Khóa tài khoản</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở khóa</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Staff List Table (Desktop: hidden md:block) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-slate-400 bg-slate-50/50 dark:bg-slate-850">
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-3">Vai trò phân quyền</th>
                <th className="py-3 px-3">Số điện thoại</th>
                <th className="py-3 px-3">Ngày tạo tài khoản</th>
                <th className="py-3 px-3 text-center">Trạng thái</th>
                <th className="py-3 px-4 text-right">Khóa / Mở khóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${
                          p.role === 'owner' ? 'bg-indigo-600' : 'bg-emerald-600'
                        }`}
                      >
                        {p.full_name.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {p.full_name}
                        </span>
                        <span className="text-[11px] text-slate-400">ID: {p.id.slice(0, 12)}...</span>
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

                  <td className="py-3 px-3 text-slate-500">
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
                    <button
                      onClick={() => handleToggleActive(p.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 ${
                        p.is_active
                          ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60'
                          : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60'
                      }`}
                    >
                      {p.is_active ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Khóa tài khoản</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Mở khóa</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

