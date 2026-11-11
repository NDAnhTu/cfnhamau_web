import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { email, password, fullName, role, phone } = await request.json();

    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: 'Thiếu thông tin bắt buộc: email, password, fullName, role' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json({ error: 'Supabase URL hoặc API key chưa được cấu hình' }, { status: 500 });
    }

    let createdUser: any = null;

    // Cách 1: Nếu có Service Role Key -> Dùng Admin API (tự động verify email)
    if (serviceKey && !serviceKey.includes('your-anon-key')) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role,
            phone: phone || '',
          },
        });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        createdUser = data.user;
      } catch (adminErr: any) {
        console.warn('Admin API failed, fallback to signUp:', adminErr.message);
      }
    }

    // Cách 2: Dùng Server signUp với Anon Key
    let userAccessToken: string | null = null;
    if (!createdUser) {
      const serverAuthClient = createClient(supabaseUrl, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      const { data, error } = await serverAuthClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
            phone: phone || '',
          },
        },
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      if (!data.user) {
        return NextResponse.json({ error: 'Không thể tạo người dùng' }, { status: 400 });
      }

      createdUser = data.user;
      if (data.session?.access_token) {
        userAccessToken = data.session.access_token;
      } else {
        // Thử sign in để lấy access_token nếu signUp không tự trả session
        const { data: signInData } = await serverAuthClient.auth.signInWithPassword({
          email,
          password,
        });
        if (signInData?.session?.access_token) {
          userAccessToken = signInData.session.access_token;
        }
      }
    }

    // Luôn đảm bảo lưu vào public.profiles
    const publicClient = userAccessToken
      ? createClient(supabaseUrl, anonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${userAccessToken}`,
            },
          },
        })
      : createClient(supabaseUrl, anonKey);

    const { error: profileErr } = await publicClient.from('profiles').upsert({
      id: createdUser.id,
      full_name: fullName,
      role,
      phone: phone || null,
      is_active: true,
    });

    if (profileErr) {
      console.warn('Upsert profile error:', profileErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Đã tạo tài khoản cho ${fullName} (${role === 'owner' ? 'Quản lý' : 'Nhân viên'}) thành công!`,
      user: createdUser,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}
