'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile, UserRole } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';

interface AuthContextType {
  user: Profile | null;
  role: UserRole | null;
  isOwner: boolean;
  isStaff: boolean;
  loading: boolean;
  isCloud: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signUpAdmin: (email: string, pass: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCloud, setIsCloud] = useState(false);

  useEffect(() => {
    async function initAuth() {
      const cloud = isSupabaseConfigured();
      setIsCloud(cloud);

      if (cloud) {
        try {
          const supabase = createClient();
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (profile) {
              setUser(profile as Profile);
              DataService.setCurrentProfile(profile as Profile);
              setLoading(false);
              return;
            } else {
              const metaRole = (session.user.user_metadata?.role as UserRole) || 'owner';
              const metaName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Tài khoản';
              const fallbackProf: Profile = {
                id: session.user.id,
                full_name: metaName,
                role: metaRole,
                is_active: true,
                created_at: new Date().toISOString(),
              };
              await supabase.from('profiles').upsert(fallbackProf);
              setUser(fallbackProf);
              DataService.setCurrentProfile(fallbackProf);
              setLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Supabase auth session check failed:', e);
        }

        // If no auth session, check if a staff user is logged in via DB profile saved in storage
        const saved = typeof window !== 'undefined' ? localStorage.getItem('cf_current_user') : null;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.id) {
              setUser(parsed as Profile);
              setLoading(false);
              return;
            }
          } catch {}
        }

        setUser(null);
        setLoading(false);
        return;
      }

      // Fallback for offline demo only
      const current = await DataService.getCurrentProfile();
      setUser(current);
      setLoading(false);
    }

    initAuth();
  }, []);

  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
    setLoading(true);
    try {
      if (isCloud) {
        const supabase = createClient();
        
        // 1. Try Supabase Auth first
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (!error && data?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          let userProfile: Profile;
          if (profile) {
            userProfile = profile as Profile;
          } else {
            const metaRole = (data.user.user_metadata?.role as UserRole) || 'staff';
            const metaName = data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'Nhân viên';
            userProfile = {
              id: data.user.id,
              full_name: metaName,
              role: metaRole,
              is_active: true,
              created_at: new Date().toISOString(),
            };
            await supabase.from('profiles').upsert(userProfile);
          }
          setUser(userProfile);
          DataService.setCurrentProfile(userProfile);
          setLoading(false);
          return { success: true, role: userProfile.role };
        }

        // 2. Direct DB profile fallback (no auth confirmation needed)
        const { data: dbProfile, error: dbErr } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', email.trim())
          .maybeSingle();

        if (dbProfile) {
          if (!dbProfile.is_active) {
            setLoading(false);
            return { success: false, error: 'Tài khoản này đã bị khóa. Vui lòng liên hệ Chủ Quán!' };
          }
          if (dbProfile.password && dbProfile.password !== pass) {
            setLoading(false);
            return { success: false, error: 'Mật khẩu không chính xác' };
          }
          const userProfile = dbProfile as Profile;
          setUser(userProfile);
          DataService.setCurrentProfile(userProfile);
          setLoading(false);
          return { success: true, role: userProfile.role };
        }

        setLoading(false);
        return { success: false, error: error?.message || 'Email hoặc mật khẩu không chính xác' };
      }

      // Local mock login
      const profiles = await DataService.getProfiles();
      const matched =
        email.includes('owner') || email.includes('chu')
          ? profiles.find((p) => p.role === 'owner') || profiles[0]
          : profiles.find((p) => p.role === 'staff') || profiles[1];

      setUser(matched);
      DataService.setCurrentProfile(matched);
      setLoading(false);
      return { success: true, role: matched.role };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Đăng nhập không thành công' };
    }
  };

  const signUpAdmin = async (
    email: string,
    pass: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(true);
    try {
      if (isCloud) {
        const supabase = createClient();
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: {
              full_name: name,
              role: 'owner',
            },
          },
        });

        if (error) {
          setLoading(false);
          return { success: false, error: error.message };
        }

        if (data.user) {
          const adminProf: Profile = {
            id: data.user.id,
            full_name: name,
            role: 'owner',
            is_active: true,
            created_at: new Date().toISOString(),
          };

          // Upsert to profiles table
          await supabase.from('profiles').upsert(adminProf);

          // Sign in session
          await supabase.auth.signInWithPassword({
            email,
            password: pass,
          });

          setUser(adminProf);
          DataService.setCurrentProfile(adminProf);
        }
        setLoading(false);
        return { success: true };
      }

      const mockAdmin: Profile = {
        id: 'owner-' + Date.now(),
        full_name: name,
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setUser(mockAdmin);
      DataService.setCurrentProfile(mockAdmin);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err.message || 'Lỗi đăng ký tài khoản Admin' };
    }
  };

  const logout = async () => {
    if (isCloud) {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}
    }
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cf_current_user');
    }
    DataService.setCurrentProfile(null as any);
  };

  const switchUser = async (profileId: string) => {
    const profiles = await DataService.getProfiles();
    const target = profiles.find((p) => p.id === profileId);
    if (target) {
      setUser(target);
      DataService.setCurrentProfile(target);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isOwner: user?.role === 'owner',
        isStaff: user?.role === 'staff',
        loading,
        isCloud,
        login,
        signUpAdmin,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

