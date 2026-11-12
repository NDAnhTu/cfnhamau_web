import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request: Request) {
  try {
    const { id, fullName, email, phone, role, password, isActive } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID nhân sự cần cập nhật' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Cập nhật qua Admin API nếu có serviceKey
    if (supabaseUrl && serviceKey && !serviceKey.includes('your-anon-key')) {
      try {
        const supabaseAdmin = createAdminClient();
        const authUpdates: any = {};
        if (password && password.trim()) authUpdates.password = password.trim();
        if (email && email.trim()) authUpdates.email = email.trim().toLowerCase();
        
        const metadata: any = {};
        if (fullName !== undefined) metadata.full_name = fullName;
        if (role !== undefined) metadata.role = role;
        if (phone !== undefined) metadata.phone = phone || '';
        if (Object.keys(metadata).length > 0) authUpdates.user_metadata = metadata;

        if (Object.keys(authUpdates).length > 0) {
          await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
        }
      } catch (adminErr: any) {
        console.warn('Admin API updateUserById warning:', adminErr.message);
      }
    }

    // 2. Cập nhật bảng public.profiles
    if (supabaseUrl && anonKey) {
      try {
        const publicClient = serviceKey && !serviceKey.includes('your-anon-key')
          ? createAdminClient()
          : createClient(supabaseUrl, anonKey);

        const profileUpdates: any = {};
        if (fullName !== undefined) profileUpdates.full_name = fullName.trim();
        if (role !== undefined) profileUpdates.role = role;
        if (phone !== undefined) profileUpdates.phone = phone ? phone.trim() : null;
        if (isActive !== undefined) profileUpdates.is_active = Boolean(isActive);

        await publicClient.from('profiles').update(profileUpdates).eq('id', id);
      } catch (profileErr: any) {
        console.warn('Cập nhật public.profiles warning:', profileErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin nhân sự thành công!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {
        // body empty
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Thiếu ID nhân sự cần xóa' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Giải phóng các ràng buộc FK trước khi xóa
    if (supabaseUrl && (serviceKey || anonKey)) {
      try {
        const client = serviceKey && !serviceKey.includes('your-anon-key')
          ? createAdminClient()
          : createClient(supabaseUrl, anonKey!);

        await client.from('orders').update({ created_by: null }).eq('created_by', id);
        await client.from('orders').update({ cancelled_by: null }).eq('cancelled_by', id);
        await client.from('cash_transactions').update({ created_by: null }).eq('created_by', id);
        await client.from('shifts').delete().eq('staff_id', id);
        await client.from('profiles').delete().eq('id', id);
      } catch (dbErr: any) {
        console.warn('Lỗi khi xóa profiles / dọn dẹp liên kết:', dbErr.message);
      }
    }

    // Xóa user trong auth nếu có Admin API
    if (supabaseUrl && serviceKey && !serviceKey.includes('your-anon-key')) {
      try {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin.auth.admin.deleteUser(id);
      } catch (adminErr: any) {
        console.warn('Lỗi xóa user trong auth admin:', adminErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa tài khoản nhân sự thành công!',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Lỗi hệ thống' }, { status: 500 });
  }
}

