import {
  Category,
  Product,
  ProductSize,
  DiningTable,
  Profile,
  Shift,
  Order,
  OrderItem,
  CashTransaction,
  CartItem,
  OrderStatus,
  PaymentMethod,
  OrderType,
} from '@/types/database';
import {
  initialCategories,
  initialProducts,
  initialTables,
  initialProfiles,
  initialShifts,
  initialOrders,
  initialCashTransactions,
} from './mock-data';
import {
  createClient,
  isSupabaseConfigured,
  refreshSupabaseSession,
  reconnectRealtimeIfDisconnected,
} from './supabase/client';
import { getLocalTimestamp, getLocalDateString, parseOrderDate } from './utils';

const STORAGE_KEYS = {
  CATEGORIES: 'cf_categories',
  PRODUCTS: 'cf_products',
  TABLES: 'cf_tables',
  PROFILES: 'cf_profiles',
  SHIFTS: 'cf_shifts',
  ORDERS: 'cf_orders',
  CASH: 'cf_cash_transactions',
  CURRENT_USER: 'cf_current_user',
};

export const PENDING_PAYMENT_CONFIRMATION_TAG = '[CHỜ XÁC NHẬN TIỀN]';

export function isAwaitingPaymentConfirmation(order?: Order | null): boolean {
  if (!order) return false;
  // 1. Đơn mang đi (takeaway): tự động chuyển qua tab "Xác nhận thanh toán" khi chưa hoàn tất thanh toán
  if (order.order_type === 'takeaway') {
    return order.status === 'pending' || Boolean(order.notes && order.notes.includes(PENDING_PAYMENT_CONFIRMATION_TAG));
  }
  // 2. Đơn tại bàn (dine_in): chỉ khi nhân viên đã bấm thanh toán và đang chờ admin xác nhận tiền
  return Boolean(order.status === 'completed' && order.notes && order.notes.includes(PENDING_PAYMENT_CONFIRMATION_TAG));
}

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

function toSafeUUID(id?: string | null): string | null {
  if (!id) return null;
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return isUUID ? id : null;
}

function generateNextOrderNumber(orders: Order[]): string {
  const existingNums = orders.map((o) => {
    const raw = (o.order_number || '').replace(/\D/g, '');
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  });
  const maxNum = Math.max(1100, ...existingNums);
  return `#${maxNum + 1}`;
}

export const DataService = {
  isCloudConnected(): boolean {
    return isSupabaseConfigured();
  },

  // -------------------------------------------------------------
  // USERS & PROFILES
  // -------------------------------------------------------------
  async getProfiles(): Promise<Profile[]> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data) return data as Profile[];
    }
    return getLocal<Profile[]>(STORAGE_KEYS.PROFILES, initialProfiles);
  },

  async getCurrentProfile(): Promise<Profile> {
    const saved = getLocal<Profile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (saved) return saved;
    const profiles = await this.getProfiles();
    const defaultUser = profiles[0] || initialProfiles[0];
    this.setCurrentProfile(defaultUser);
    return defaultUser;
  },

  setCurrentProfile(profile: Profile): void {
    setLocal(STORAGE_KEYS.CURRENT_USER, profile);
  },

  async toggleProfileActive(id: string): Promise<boolean> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data: current } = await supabase.from('profiles').select('is_active').eq('id', id).single();
      if (current) {
        await supabase.from('profiles').update({ is_active: !current.is_active }).eq('id', id);
        return !current.is_active;
      }
    }
    const profiles = await this.getProfiles();
    const updated = profiles.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p));
    setLocal(STORAGE_KEYS.PROFILES, updated);
    return true;
  },

  async createProfile(profile: Omit<Profile, 'created_at'>): Promise<Profile> {
    const newProfile: Profile = {
      ...profile,
      created_at: new Date().toISOString(),
    };
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { error } = await supabase.from('profiles').insert([newProfile]);
      if (error) {
        console.error('Lỗi insert profile Supabase:', error);
        throw new Error('Lỗi lưu vào DB: ' + error.message);
      }
    }
    const list = await this.getProfiles();
    setLocal(STORAGE_KEYS.PROFILES, [newProfile, ...list]);
    return newProfile;
  },

  async updateProfile(id: string, updates: Partial<Omit<Profile, 'id' | 'created_at'>>): Promise<Profile> {
    try {
      await fetch('/api/admin/manage-user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          fullName: updates.full_name,
          email: updates.email,
          phone: updates.phone,
          role: updates.role,
          password: updates.password,
          isActive: updates.is_active,
        }),
      });
    } catch (e) {
      console.warn('Gọi /api/admin/manage-user PUT warning:', e);
    }

    if (this.isCloudConnected()) {
      try {
        const supabase = createClient();
        const payload: any = {};
        if (updates.full_name !== undefined) payload.full_name = updates.full_name.trim();
        if (updates.role !== undefined) payload.role = updates.role;
        if (updates.phone !== undefined) payload.phone = updates.phone ? updates.phone.trim() : null;
        if (updates.is_active !== undefined) payload.is_active = updates.is_active;

        await supabase.from('profiles').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Direct supabase profile update error:', err);
      }
    }

    const profiles = await this.getProfiles();
    let updatedProfile: Profile | null = null;
    const updated = profiles.map((p) => {
      if (p.id === id) {
        updatedProfile = {
          ...p,
          ...updates,
          full_name: updates.full_name !== undefined ? updates.full_name.trim() : p.full_name,
          phone: updates.phone !== undefined ? (updates.phone ? updates.phone.trim() : null) : p.phone,
          email: updates.email !== undefined ? (updates.email ? updates.email.trim().toLowerCase() : null) : p.email,
        };
        return updatedProfile;
      }
      return p;
    });

    setLocal(STORAGE_KEYS.PROFILES, updated);

    const currentUser = getLocal<Profile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (currentUser && currentUser.id === id && updatedProfile) {
      setLocal(STORAGE_KEYS.CURRENT_USER, updatedProfile);
    }

    if (!updatedProfile) throw new Error('Không tìm thấy tài khoản nhân sự để cập nhật');
    return updatedProfile;
  },

  async deleteProfile(id: string): Promise<void> {
    try {
      await fetch(`/api/admin/manage-user?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Gọi /api/admin/manage-user DELETE warning:', e);
    }

    if (this.isCloudConnected()) {
      try {
        const supabase = createClient();
        await supabase.from('orders').update({ created_by: null }).eq('created_by', id);
        await supabase.from('orders').update({ cancelled_by: null }).eq('cancelled_by', id);
        await supabase.from('cash_transactions').update({ created_by: null }).eq('created_by', id);
        await supabase.from('shifts').delete().eq('staff_id', id);
        await supabase.from('profiles').delete().eq('id', id);
      } catch (err) {
        console.warn('Direct supabase profile delete error:', err);
      }
    }

    const profiles = await this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== id);
    setLocal(STORAGE_KEYS.PROFILES, filtered);
  },

  // -------------------------------------------------------------
  // CATEGORIES
  // -------------------------------------------------------------
  async getCategories(): Promise<Category[]> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (!error && data) return data as Category[];
    }
    const local = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, initialCategories);
    return [...local].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  },

  async reorderCategories(orderedCategories: { id: number; display_order: number }[]): Promise<Category[]> {
    const categories = await this.getCategories();
    const updated = categories.map((c) => {
      const match = orderedCategories.find((oc) => oc.id === c.id);
      return match ? { ...c, display_order: match.display_order } : c;
    });

    updated.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    setLocal(STORAGE_KEYS.CATEGORIES, updated);

    if (this.isCloudConnected()) {
      const supabase = createClient();
      await Promise.all(
        orderedCategories.map((oc) =>
          supabase.from('categories').update({ display_order: oc.display_order }).eq('id', oc.id)
        )
      );
    }

    return updated;
  },

  async saveCategory(category: Partial<Category> & { name: string }): Promise<Category> {
    const categories = await this.getCategories();
    let saved: Category;

    if (category.id) {
      const existing = categories.find((c) => c.id === category.id);
      saved = {
        ...(existing || { id: category.id, name: category.name, is_active: true, display_order: 0, created_at: new Date().toISOString() }),
        ...category,
      };
      if (this.isCloudConnected()) {
        const supabase = createClient();
        const updatePayload: any = {
          name: category.name.trim(),
        };
        if (category.display_order !== undefined) updatePayload.display_order = category.display_order;
        if (category.is_active !== undefined) updatePayload.is_active = category.is_active;

        const { error } = await supabase.from('categories').update(updatePayload).eq('id', category.id);
        if (error) {
          console.error('Lỗi Supabase khi sửa danh mục:', error);
          throw new Error('Lỗi Supabase khi sửa danh mục: ' + error.message);
        }
      }
      const updated = categories.map((c) => (c.id === category.id ? saved : c));
      setLocal(STORAGE_KEYS.CATEGORIES, updated);
    } else {
      const nextId = Math.max(...categories.map((c) => c.id), 0) + 1;
      saved = {
        id: nextId,
        name: category.name.trim(),
        display_order: category.display_order ?? categories.length + 1,
        is_active: category.is_active ?? true,
        created_at: new Date().toISOString(),
      };
      if (this.isCloudConnected()) {
        const supabase = createClient();
        const { data: inserted, error: insertErr } = await supabase
          .from('categories')
          .insert({
            name: category.name.trim(),
            display_order: category.display_order ?? categories.length + 1,
            is_active: category.is_active ?? true,
          })
          .select()
          .single();

        if (insertErr) {
          console.error('Lỗi Supabase khi thêm danh mục:', insertErr);
          throw new Error('Lỗi Supabase khi thêm danh mục: ' + insertErr.message);
        }
        if (inserted) saved.id = inserted.id;
      }
      setLocal(STORAGE_KEYS.CATEGORIES, [...categories, saved]);
    }
    return saved;
  },

  async deleteCategory(categoryId: number): Promise<void> {
    const categories = await this.getCategories();
    if (this.isCloudConnected()) {
      const supabase = createClient();
      // Trước tiên bỏ liên kết category_id của các sản phẩm thuộc danh mục này để không vi phạm ràng buộc FK
      await supabase.from('products').update({ category_id: null }).eq('category_id', categoryId);
      const { error } = await supabase.from('categories').delete().eq('id', categoryId);
      if (error) {
        console.error('Lỗi Supabase khi xóa danh mục:', error);
        throw new Error('Lỗi Supabase khi xóa danh mục: ' + error.message);
      }
    }

    // Cập nhật sản phẩm trong localStorage nếu có
    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const updatedProducts = products.map((p) =>
      p.category_id === categoryId ? { ...p, category_id: undefined } : p
    );
    setLocal(STORAGE_KEYS.PRODUCTS, updatedProducts);

    const updated = categories.filter((c) => c.id !== categoryId);
    setLocal(STORAGE_KEYS.CATEGORIES, updated);
  },

  // -------------------------------------------------------------
  // PRODUCTS & SIZES
  // -------------------------------------------------------------
  async getProducts(onlyActive = true): Promise<Product[]> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      let query = supabase
        .from('products')
        .select(`
          id,
          category_id,
          name,
          has_sizes,
          base_price,
          image_url,
          is_available,
          is_active,
          is_quick_created,
          created_at,
          categories (id, name),
          product_sizes (id, size_name, price, is_available)
        `)
        .order('id', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;
      if (!error && data) {
        return data.map((item: any) => ({
          ...item,
          category: item.categories,
          sizes: item.product_sizes || [],
        })) as Product[];
      }
    }

    const products = getLocal<Product[]>(STORAGE_KEYS.PRODUCTS, initialProducts);
    return onlyActive ? products.filter((p) => p.is_active) : products;
  },

  async toggleProductAvailability(id: number): Promise<boolean> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data } = await supabase.from('products').select('is_available').eq('id', id).single();
      if (data) {
        await supabase.from('products').update({ is_available: !data.is_available }).eq('id', id);
        return !data.is_available;
      }
    }
    const products = await this.getProducts(false);
    let newState = true;
    const updated = products.map((p) => {
      if (p.id === id) {
        newState = !p.is_available;
        return { ...p, is_available: newState };
      }
      return p;
    });
    setLocal(STORAGE_KEYS.PRODUCTS, updated);
    return newState;
  },

  async saveProduct(
    productData: Partial<Product> & { name: string },
    sizes: { size_name: string; price: number; is_available?: boolean }[] = []
  ): Promise<Product> {
    const products = await this.getProducts(false);
    let saved: Product;

    if (productData.id) {
      // Update existing
      const existing = products.find((p) => p.id === productData.id)!;
      saved = {
        ...existing,
        ...productData,
        sizes: productData.has_sizes
          ? sizes.map((s, idx) => ({
              id: existing.sizes?.[idx]?.id || Math.floor(Math.random() * 100000),
              product_id: productData.id!,
              size_name: s.size_name,
              price: Number(s.price),
              is_available: s.is_available ?? true,
              created_at: new Date().toISOString(),
            }))
          : [],
      };

      if (this.isCloudConnected()) {
        const supabase = createClient();
        await supabase
          .from('products')
          .update({
            category_id: productData.category_id,
            name: productData.name,
            has_sizes: productData.has_sizes,
            base_price: productData.base_price,
            image_url: productData.image_url,
            is_available: productData.is_available,
            is_active: productData.is_active,
          })
          .eq('id', productData.id);

        if (productData.has_sizes) {
          await supabase.from('product_sizes').delete().eq('product_id', productData.id);
          if (sizes.length > 0) {
            await supabase.from('product_sizes').insert(
              sizes.map((s) => ({
                product_id: productData.id,
                size_name: s.size_name,
                price: s.price,
                is_available: s.is_available ?? true,
              }))
            );
          }
        }
      }

      const updated = products.map((p) => (p.id === productData.id ? saved : p));
      setLocal(STORAGE_KEYS.PRODUCTS, updated);
    } else {
      // Insert new
      const nextId = Math.max(...products.map((p) => p.id), 0) + 1;
      saved = {
        id: nextId,
        category_id: productData.category_id || null,
        name: productData.name,
        has_sizes: Boolean(productData.has_sizes),
        base_price: Number(productData.base_price) || 0,
        image_url: productData.image_url || null,
        is_available: productData.is_available ?? true,
        is_active: true,
        is_quick_created: Boolean(productData.is_quick_created),
        created_at: new Date().toISOString(),
        sizes: productData.has_sizes
          ? sizes.map((s, idx) => ({
              id: nextId * 100 + idx,
              product_id: nextId,
              size_name: s.size_name,
              price: Number(s.price),
              is_available: s.is_available ?? true,
              created_at: new Date().toISOString(),
            }))
          : [],
      };

      if (this.isCloudConnected()) {
        const supabase = createClient();
        const { data: newProd } = await supabase
          .from('products')
          .insert({
            category_id: productData.category_id,
            name: productData.name,
            has_sizes: productData.has_sizes,
            base_price: productData.base_price,
            image_url: productData.image_url,
            is_available: productData.is_available ?? true,
            is_active: true,
            is_quick_created: Boolean(productData.is_quick_created),
          })
          .select()
          .single();

        if (newProd && productData.has_sizes && sizes.length > 0) {
          await supabase.from('product_sizes').insert(
            sizes.map((s) => ({
              product_id: newProd.id,
              size_name: s.size_name,
              price: s.price,
            }))
          );
        }
      }

      setLocal(STORAGE_KEYS.PRODUCTS, [saved, ...products]);
    }
    return saved;
  },

  async softDeleteProduct(id: number): Promise<void> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      await supabase.from('products').update({ is_active: false }).eq('id', id);
    }
    const products = await this.getProducts(false);
    const updated = products.map((p) => (p.id === id ? { ...p, is_active: false } : p));
    setLocal(STORAGE_KEYS.PRODUCTS, updated);
  },

  // -------------------------------------------------------------
  // TABLES (QUẢN LÝ THEO TÊN BÀN LINH HOẠT TỪ ĐƠN HÀNG)
  // -------------------------------------------------------------
  async getTables(): Promise<DiningTable[]> {
    // Không dùng bảng tables tĩnh nữa, lấy danh sách các bàn đang mở từ orders pending
    const activeInfo = await this.getActiveTablesWithOrders();
    return activeInfo.map((a) => a.table);
  },

  async getOrCreateTableByName(tableName: string): Promise<DiningTable> {
    const cleanName = tableName.trim();
    if (!cleanName || cleanName.toLowerCase().includes('mang về') || cleanName.toLowerCase().includes('takeaway')) {
      return { id: 1, name: 'Mang về (Takeaway)', is_occupied: false };
    }
    return { name: cleanName, is_occupied: true };
  },

  async getActiveTablesWithOrders(dateFilter?: string): Promise<import('@/types/database').ActiveTableInfo[]> {
    const orders = await this.getOrders();

    // CHỈ lấy các đơn dine_in (tại bàn) đang pending đại diện cho các bàn đang ngồi
    // Đơn mang đi (takeaway) không nằm ở Sơ đồ bàn đang phục vụ mà chuyển qua tab "Xác nhận thanh toán"
    const pendingOrders = orders.filter((o) => {
      const isPendingDineIn = o.status === 'pending' && o.order_type === 'dine_in';
      if (!dateFilter) return isPendingDineIn;
      return isPendingDineIn && (getLocalDateString(o.created_at) === dateFilter || o.created_at.startsWith(dateFilter));
    });

    const result: import('@/types/database').ActiveTableInfo[] = pendingOrders.map((activeOrder) => {
      const resolvedName =
        activeOrder.table_name ||
        activeOrder.table?.name ||
        (activeOrder.order_type === 'takeaway' ? 'Mang về' : 'Bàn chưa đặt tên');
      const table: DiningTable = {
        id: activeOrder.id,
        name: resolvedName,
        is_occupied: true,
        active_order: activeOrder,
      };

      const totalAmount = activeOrder.final_amount;
      const itemsCount = activeOrder.items
        ? activeOrder.items.reduce((acc, i) => acc + i.quantity, 0)
        : 0;

      return {
        table,
        activeOrder,
        elapsedMinutes: 0,
        totalAmount,
        itemsCount,
      };
    });

    // Sắp xếp đơn mới nhất lên đầu
    result.sort((a, b) => {
      const timeA = a.activeOrder ? parseOrderDate(a.activeOrder.created_at).getTime() : 0;
      const timeB = b.activeOrder ? parseOrderDate(b.activeOrder.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  },

  async transferTable(orderIdOrTableId: number, targetTableName: string): Promise<DiningTable> {
    const cleanName = targetTableName.trim();
    const orders = await this.getOrders();
    const pendingOrder = orders.find(
      (o) =>
        (Number(o.id) === Number(orderIdOrTableId) || Number(o.table_id) === Number(orderIdOrTableId)) &&
        o.status === 'pending'
    );

    if (pendingOrder) {
      pendingOrder.table_name = cleanName;
      pendingOrder.table = { id: pendingOrder.id, name: cleanName, is_occupied: true };

      if (pendingOrder.notes && pendingOrder.notes.includes('Đơn bàn ')) {
        pendingOrder.notes = pendingOrder.notes.replace(/Đơn bàn [^|]+/, `Đơn bàn ${cleanName}`);
      }

      if (this.isCloudConnected()) {
        const supabase = createClient();
        const updatePayload: any = { table_name: cleanName };
        if (pendingOrder.notes) updatePayload.notes = pendingOrder.notes;

        const { error: upErr } = await supabase
          .from('orders')
          .update(updatePayload)
          .eq('id', pendingOrder.id);

        if (upErr && upErr.message?.includes('table_name')) {
          delete updatePayload.table_name;
          updatePayload.table = cleanName;
          await supabase.from('orders').update(updatePayload).eq('id', pendingOrder.id);
        }
      }
      setLocal(STORAGE_KEYS.ORDERS, orders);
    }

    return { id: pendingOrder?.id || 0, name: cleanName, is_occupied: true };
  },

  subscribeToTablesAndOrders(callback: () => void): () => void {
    let lastTriggerTime = 0;
    const throttledCallback = (immediate = false) => {
      const now = Date.now();
      if (immediate || now - lastTriggerTime > 1200) {
        lastTriggerTime = now;
        callback();
      }
    };

    // Khi người dùng mở lại app từ chế độ ngủ / khóa màn hình
    const handleVisibilityChange = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        try {
          await refreshSupabaseSession();
          reconnectRealtimeIfDisconnected();
        } catch {}
        throttledCallback();
      }
    };

    // Khi cửa sổ/tab nhận lại tiêu điểm
    const handleFocus = () => {
      throttledCallback();
    };

    // Khi thiết bị có mạng trở lại sau khi mất kết nối
    const handleOnline = () => {
      reconnectRealtimeIfDisconnected();
      throttledCallback();
    };

    // Khi người dùng thực hiện thao tác vuốt làm mới (Pull-to-refresh)
    const handlePullToRefresh = (e: Event) => {
      e.preventDefault();
      throttledCallback(true);
    };

    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleOnline);
      window.addEventListener('app:pull-to-refresh', handlePullToRefresh);
    }

    if (this.isCloudConnected()) {
      const supabase = createClient();
      const channelId = `realtime_orders_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          // Sự kiện realtime trực tiếp thì gọi callback ngay lập tức
          callback();
        })
        .subscribe((status) => {
          if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
            console.warn('[Realtime] Subscription interrupted:', status);
            throttledCallback();
          }
        });

      return () => {
        if (typeof window !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('focus', handleFocus);
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('app:pull-to-refresh', handlePullToRefresh);
        }
        supabase.removeChannel(channel);
      };
    }

    // Polling fallback cho chế độ offline/local storage
    const interval = setInterval(callback, 3000);
    const handleStorage = () => callback();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
    }
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('app:pull-to-refresh', handlePullToRefresh);
      }
    };
  },

  async setTableOccupied(id: number, occupied: boolean): Promise<void> {
    // Bảng tables đã được loại bỏ, trạng thái bàn tự động phụ thuộc vào order status
    return;
  },

  // -------------------------------------------------------------
  // SHIFTS
  // -------------------------------------------------------------
  async getShifts(): Promise<Shift[]> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('shifts')
        .select(`*, profiles(id, full_name, role)`)
        .order('id', { ascending: false });
      if (!error && data) {
        return data.map((s: any) => ({ ...s, staff: s.profiles })) as Shift[];
      }
      return [];
    }
    return getLocal<Shift[]>(STORAGE_KEYS.SHIFTS, initialShifts);
  },

  async getActiveShift(staffId?: string): Promise<Shift | null> {
    const shifts = await this.getShifts();
    if (staffId) {
      return shifts.find((s) => s.status === 'open' && s.staff_id === staffId) || null;
    }
    return shifts.find((s) => s.status === 'open') || null;
  },

  async startShift(staffId: string, startingCash: number, notes?: string): Promise<Shift> {
    const shifts = await this.getShifts();
    const profiles = await this.getProfiles();
    const staff = profiles.find((p) => p.id === staffId) || {
      id: staffId,
      full_name: 'Nhân viên trực ca',
      role: 'staff',
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const nextId = Math.max(...shifts.map((s) => s.id), 0) + 1;
    let newShift: Shift = {
      id: nextId,
      staff_id: staffId,
      staff,
      start_time: new Date().toISOString(),
      end_time: null,
      starting_cash: startingCash,
      ending_cash_system: startingCash,
      ending_cash_actual: null,
      difference: null,
      status: 'open',
      notes: notes || null,
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      let currentStaffId = toSafeUUID(staffId);
      if (!currentStaffId) {
        const { data: { session } } = await supabase.auth.getSession();
        currentStaffId = session?.user?.id || null;
      }

      if (!currentStaffId) {
        throw new Error('Vui lòng đăng nhập tài khoản trước khi vào ca làm việc!');
      }

      // Ensure profile exists in profiles table
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentStaffId)
        .maybeSingle();

      if (!prof) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        await supabase.from('profiles').upsert({
          id: currentStaffId,
          full_name: authUser?.user_metadata?.full_name || staff?.full_name || 'Nhân viên trực ca',
          role: authUser?.user_metadata?.role || staff?.role || 'staff',
          is_active: true,
        });
      }

      const { data, error } = await supabase
        .from('shifts')
        .insert({
          staff_id: currentStaffId,
          starting_cash: startingCash,
          status: 'open',
          notes: notes || null,
        })
        .select(`*, profiles(id, full_name, role)`)
        .single();

      if (error) {
        console.error('Lỗi khi mở ca trên Supabase:', error);
        throw new Error('Lỗi Supabase khi mở ca: ' + error.message);
      }

      if (data) {
        newShift = {
          ...newShift,
          id: data.id,
          staff_id: data.staff_id,
          staff: data.profiles || staff,
        };
      }
    }

    setLocal(STORAGE_KEYS.SHIFTS, [newShift, ...shifts]);
    return newShift;
  },

  async closeShift(
    shiftId: number,
    endingActual: number,
    notes?: string
  ): Promise<Shift> {
    const shifts = await this.getShifts();
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) throw new Error('Không tìm thấy ca làm việc');

    // Calculate theoretical cash: startingCash + completed cash orders - expenses in this shift
    const orders = await this.getOrders();
    const shiftOrders = orders.filter((o) => o.shift_id === shiftId && o.status === 'completed' && o.payment_method === 'cash');
    const cashOrderTotal = shiftOrders.reduce((acc, o) => acc + o.final_amount, 0);

    const cashTxns = await this.getCashTransactions();
    const shiftTxns = cashTxns.filter((t) => t.shift_id === shiftId);
    const incomeTotal = shiftTxns.filter((t) => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expenseTotal = shiftTxns.filter((t) => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    const endingSystem = shift.starting_cash + cashOrderTotal + incomeTotal - expenseTotal;
    const difference = endingActual - endingSystem;

    const updatedShift: Shift = {
      ...shift,
      end_time: new Date().toISOString(),
      ending_cash_system: endingSystem,
      ending_cash_actual: endingActual,
      difference,
      status: 'closed',
      notes: notes ? `${shift.notes ? shift.notes + ' | ' : ''}${notes}` : shift.notes,
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { error } = await supabase
        .from('shifts')
        .update({
          end_time: updatedShift.end_time,
          ending_cash_system: endingSystem,
          ending_cash_actual: endingActual,
          difference,
          status: 'closed',
          notes: updatedShift.notes,
        })
        .eq('id', shiftId);
      if (error) {
        throw new Error('Lỗi chốt ca: ' + error.message);
      }
    }

    const updated = shifts.map((s) => (s.id === shiftId ? updatedShift : s));
    setLocal(STORAGE_KEYS.SHIFTS, updated);
    return updatedShift;
  },

  // -------------------------------------------------------------
  // ORDERS & ORDER ITEMS
  // -------------------------------------------------------------
  async getOrders(): Promise<Order[]> {
    const profiles = await this.getProfiles();
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('id', { ascending: false });

      if (!error && data) {
        return data.map((o: any) => {
          let creator =
            profiles.find((p) => p.id === o.created_by) ||
            (o.created_by
              ? {
                  id: o.created_by,
                  full_name: 'Nhân viên',
                  role: 'staff',
                  is_active: true,
                  created_at: '',
                }
              : undefined);

          // Khôi phục tên người tạo nếu created_by bị null nhưng trong các món có ghi chú "Thêm bởi: <tên>"
          if ((!creator || creator.full_name === 'Nhân viên') && Array.isArray(o.order_items)) {
            for (const it of o.order_items) {
              if (it.notes && it.notes.includes('Thêm bởi:')) {
                const m = it.notes.match(/Thêm bởi:\s*([^|]+)/);
                if (m && m[1]?.trim()) {
                  const extractedName = m[1].trim();
                  const matched = profiles.find(
                    (p) => p.full_name.trim().toLowerCase() === extractedName.toLowerCase()
                  );
                  creator = matched || {
                    id: o.created_by || 'creator-id',
                    full_name: extractedName,
                    role: 'staff',
                    is_active: true,
                    created_at: '',
                  };
                  break;
                }
              }
            }
          }

          let completer = profiles.find((p) => p.id === o.completed_by);
          if (!completer && o.notes && o.notes.includes('Thanh toán bởi:')) {
            const m = o.notes.match(/Thanh toán bởi:\s*([^\]|]+)/);
            if (m) {
              completer = {
                id: o.completed_by || 'completer-id',
                full_name: m[1].trim(),
                role: 'staff',
                is_active: true,
                created_at: '',
              };
            }
          }

          // Lấy tên bàn từ cột table_name hoặc table
          const resolvedTableName =
            o.table_name ||
            o.table ||
            (o.order_type === 'takeaway' ? 'Mang về (Takeaway)' : 'Bàn 01');

          return {
            ...o,
            table_name: resolvedTableName,
            table: {
              id: o.table_id || o.id,
              name: resolvedTableName,
              is_occupied: o.status === 'pending',
            },
            creator,
            completer,
            items: o.order_items || [],
          } as Order;
        });
      }
      return [];
    }
    const local = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
    return local.map((o) => {
      const creator = profiles.find((p) => p.id === o.created_by);
      const completer = profiles.find((p) => p.id === o.completed_by);
      const resolvedTableName =
        o.table_name ||
        o.table?.name ||
        (o.order_type === 'takeaway' ? 'Mang về (Takeaway)' : 'Bàn 01');
      return {
        ...o,
        table_name: resolvedTableName,
        table: {
          id: o.table_id || o.id,
          name: resolvedTableName,
          is_occupied: o.status === 'pending',
        },
        creator: creator || o.creator,
        completer: completer || o.completer,
      };
    });
  },

  async createOrder({
    tableId,
    tableName,
    orderType,
    cartItems,
    discountAmount = 0,
    paymentMethod,
    status = 'completed',
    notes,
    shiftId,
    staffId,
  }: {
    tableId?: number;
    tableName?: string;
    orderType: OrderType;
    cartItems: CartItem[];
    discountAmount?: number;
    paymentMethod: PaymentMethod;
    status?: OrderStatus;
    notes?: string;
    shiftId?: number;
    staffId: string;
  }): Promise<Order> {
    const orders = await this.getOrders();
    const profiles = await this.getProfiles();

    const resolvedTableName =
      tableName?.trim() ||
      (orderType === 'takeaway' ? 'Mang về (Takeaway)' : 'Bàn 01');

    const table: DiningTable = {
      id: tableId || Math.floor(Math.random() * 100000),
      name: resolvedTableName,
      is_occupied: status === 'pending',
    };

    const creator = profiles.find((p) => p.id === staffId) || profiles[0];

    const totalAmount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const finalAmount = Math.max(0, totalAmount - discountAmount);
    const nextOrderId = Math.max(...orders.map((o) => Number(o.id) || 0), 0) + 1;
    const orderNumber = generateNextOrderNumber(orders);

    const currentLocalTimestamp = getLocalTimestamp();
    const creatorName = creator?.full_name || 'Nhân viên';
    const formatInitialItemNote = (rawNote?: string | null) => {
      const tag = `Thêm bởi: ${creatorName}`;
      if (rawNote && rawNote.trim()) {
        return `${rawNote.trim()} | ${tag}`;
      }
      return tag;
    };

    const newOrder: Order = {
      id: nextOrderId,
      shift_id: shiftId || null,
      order_number: orderNumber,
      table_name: resolvedTableName,
      table_id: tableId || null,
      table,
      order_type: orderType,
      created_by: staffId || creator?.id,
      creator,
      status,
      payment_method: paymentMethod,
      total_amount: totalAmount,
      discount_amount: discountAmount,
      final_amount: finalAmount,
      notes: notes || null,
      created_at: currentLocalTimestamp,
      completed_at: status === 'completed' ? currentLocalTimestamp : null,
      items: cartItems.map((item, idx) => ({
        id: nextOrderId * 100 + idx,
        order_id: nextOrderId,
        product_id: item.isCustom ? null : item.productId || null,
        product_size_id: item.sizeId || null,
        item_name: item.name,
        size_name: item.sizeName || null,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        notes: formatInitialItemNote(item.notes),
        is_custom: Boolean(item.isCustom),
        status: 'active',
      })),
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      const insertPayload: any = {
        shift_id: shiftId || null,
        order_number: orderNumber,
        table_name: resolvedTableName,
        order_type: orderType,
        created_by: toSafeUUID(staffId) || toSafeUUID(creator?.id),
        status,
        payment_method: paymentMethod,
        total_amount: totalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        notes,
        created_at: currentLocalTimestamp,
        completed_at: status === 'completed' ? currentLocalTimestamp : null,
      };

      // Thử chèn với cột table_name
      let { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single();

      // Nếu người dùng tạo tên cột là "table" thay vì "table_name"
      if (orderErr && orderErr.message?.includes('table_name')) {
        delete insertPayload.table_name;
        insertPayload['table'] = resolvedTableName;
        const retry = await supabase.from('orders').insert(insertPayload).select().single();
        orderData = retry.data;
        orderErr = retry.error;
      }

      if (!orderErr && orderData) {
        newOrder.id = orderData.id;
        const itemInserts = cartItems.map((item) => ({
          order_id: orderData.id,
          product_id: item.isCustom ? null : item.productId || null,
          product_size_id: item.sizeId || null,
          item_name: item.name,
          size_name: item.sizeName || null,
          unit_price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity,
          notes: formatInitialItemNote(item.notes),
          is_custom: Boolean(item.isCustom),
          status: 'active',
        }));
        const { data: insertedItems } = await supabase.from('order_items').insert(itemInserts).select();
        if (insertedItems && insertedItems.length > 0) {
          newOrder.items = insertedItems;
        }
      } else if (orderErr) {
        console.error('Lỗi khi lưu đơn vào Supabase:', orderErr);
        throw new Error('Lỗi Supabase khi lưu đơn: ' + orderErr.message);
      }
    }

    setLocal(STORAGE_KEYS.ORDERS, [newOrder, ...orders]);
    return newOrder;
  },

  async addItemsToExistingOrder(
    orderId: number,
    newItems: CartItem[],
    staffId?: string,
    customStaffName?: string
  ): Promise<Order> {
    const orders = await this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng cần thêm món');

    let resolvedStaffName = customStaffName || '';
    if (!resolvedStaffName && staffId) {
      const profiles = await this.getProfiles();
      const staff = profiles.find((p) => p.id === staffId);
      resolvedStaffName = staff?.full_name || 'Nhân viên';
    }
    if (!resolvedStaffName) {
      resolvedStaffName = 'Nhân viên';
    }

    const addedAmount = newItems.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const newTotal = order.total_amount + addedAmount;
    const newFinal = Math.max(0, newTotal - order.discount_amount);

    const formatAddedItemNote = (rawNote?: string | null) => {
      const tag = `Thêm bởi: ${resolvedStaffName}`;
      if (rawNote && rawNote.trim()) {
        return `${rawNote.trim()} | ${tag}`;
      }
      return tag;
    };

    const newOrderItems: OrderItem[] = newItems.map((item, idx) => ({
      id: orderId * 1000 + (order.items?.length || 0) + idx + 1,
      order_id: orderId,
      product_id: item.isCustom ? null : item.productId || null,
      product_size_id: item.sizeId || null,
      item_name: item.name,
      size_name: item.sizeName || null,
      unit_price: item.price,
      quantity: item.quantity,
      subtotal: item.price * item.quantity,
      notes: formatAddedItemNote(item.notes),
      is_custom: Boolean(item.isCustom),
      status: 'active',
    }));

    const updatedOrder: Order = {
      ...order,
      total_amount: newTotal,
      final_amount: newFinal,
      items: [...(order.items || []), ...newOrderItems],
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      await supabase
        .from('orders')
        .update({
          total_amount: newTotal,
          final_amount: newFinal,
        })
        .eq('id', orderId);

      const itemInserts = newItems.map((item) => ({
        order_id: orderId,
        product_id: item.isCustom ? null : item.productId || null,
        product_size_id: item.sizeId || null,
        item_name: item.name,
        size_name: item.sizeName || null,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        notes: formatAddedItemNote(item.notes),
        is_custom: Boolean(item.isCustom),
        status: 'active',
      }));
      const { data: insertedItems } = await supabase.from('order_items').insert(itemInserts).select();
      if (insertedItems && insertedItems.length > 0) {
        updatedOrder.items = [...(order.items || []), ...insertedItems];
      }
    }

    const updatedList = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    setLocal(STORAGE_KEYS.ORDERS, updatedList);
    return updatedOrder;
  },

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
    cancelReason?: string,
    cancelledBy?: string,
    completedBy?: string,
    additionalNotes?: string
  ): Promise<Order> {
    const orders = await this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    const profiles = await this.getProfiles();
    const completer = completedBy ? profiles.find((p) => p.id === completedBy) : null;
    const completerName = completer?.full_name || 'Nhân viên';

    let finalNotes = additionalNotes !== undefined ? (additionalNotes || '') : (order.notes || '');
    if (status === 'completed' && completedBy) {
      const tag = `[Thanh toán bởi: ${completerName}]`;
      if (!finalNotes.includes('Thanh toán bởi:')) {
        finalNotes = finalNotes ? `${finalNotes} | ${tag}` : tag;
      }
    }

    const currentLocalTimestamp = getLocalTimestamp();
    const updatedOrder: Order = {
      ...order,
      status,
      cancel_reason: status === 'cancelled' ? cancelReason || order.cancel_reason : (status === 'pending' ? null : order.cancel_reason),
      cancelled_by: status === 'cancelled' ? cancelledBy || order.cancelled_by : (status === 'pending' ? null : order.cancelled_by),
      completed_by: status === 'completed' ? completedBy || order.completed_by : (status === 'pending' ? null : order.completed_by),
      completer: status === 'completed' ? completer || order.completer : (status === 'pending' ? null : order.completer),
      completed_at: status === 'completed' ? currentLocalTimestamp : (status === 'pending' ? null : order.completed_at),
      notes: finalNotes || null,
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      const updatePayload: any = {
        status,
        cancel_reason: status === 'cancelled' ? cancelReason : null,
        cancelled_by: status === 'cancelled' ? toSafeUUID(cancelledBy) : null,
        completed_at: status === 'completed' ? updatedOrder.completed_at : null,
        notes: updatedOrder.notes,
      };

      if (status === 'completed' && completedBy && toSafeUUID(completedBy)) {
        updatePayload.completed_by = toSafeUUID(completedBy);
      } else if (status === 'pending') {
        updatePayload.completed_by = null;
      }

      const { error: updateErr } = await supabase.from('orders').update(updatePayload).eq('id', orderId);
      if (updateErr && updateErr.message?.includes('completed_by')) {
        delete updatePayload.completed_by;
        await supabase.from('orders').update(updatePayload).eq('id', orderId);
      }
    }


    const updated = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    setLocal(STORAGE_KEYS.ORDERS, updated);
    return updatedOrder;
  },

  async confirmOrderPayment(orderId: number, adminId?: string): Promise<Order> {
    const orders = await this.getOrders();
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new Error('Không tìm thấy đơn hàng #' + orderId);

    const cleanedNotes = (order.notes || '')
      .replaceAll(PENDING_PAYMENT_CONFIRMATION_TAG, '')
      .trim() || null;

    const currentTimestamp = getLocalTimestamp();
    const updatePayload: any = {
      status: 'completed',
      completed_at: order.completed_at || currentTimestamp,
      notes: cleanedNotes,
    };
    if (adminId) {
      updatePayload.completed_by = toSafeUUID(adminId);
    }

    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { error: updateErr } = await supabase
        .from('orders')
        .update(updatePayload)
        .eq('id', orderId);

      if (updateErr && updateErr.message?.includes('completed_by')) {
        delete updatePayload.completed_by;
        await supabase.from('orders').update(updatePayload).eq('id', orderId);
      }
    }

    const updatedOrder: Order = {
      ...order,
      ...updatePayload,
      status: 'completed',
      completed_at: updatePayload.completed_at,
      notes: cleanedNotes,
    };

    const updated = orders.map((o) => (o.id === orderId ? updatedOrder : o));
    setLocal(STORAGE_KEYS.ORDERS, updated);
    return updatedOrder;
  },

  async splitAndPayOrder({
    originalOrderId,
    selectedItems,
    paymentMethod,
    notes,
    staffId,
  }: {
    originalOrderId: number;
    selectedItems: { itemId: number; quantity: number; itemName?: string; unitPrice?: number }[];
    paymentMethod: PaymentMethod;
    notes?: string;
    staffId: string;
  }): Promise<{ paidOrder: Order; remainingOrder: Order | null }> {
    const orders = await this.getOrders();
    const originalOrder = orders.find((o) => o.id === originalOrderId);
    if (!originalOrder) throw new Error('Không tìm thấy đơn hàng cần tách thanh toán');

    const profiles = await this.getProfiles();
    const staff = profiles.find((p) => p.id === staffId);
    const staffName = staff?.full_name || 'Nhân viên';

    // Phân loại các món thanh toán và các món còn lại
    const paidOrderItems: OrderItem[] = [];
    const remainingOrderItems: OrderItem[] = [];
    let paidTotal = 0;
    let remainingTotal = 0;

    for (const origItem of originalOrder.items || []) {
      const selected = selectedItems.find(
        (s) =>
          Number(s.itemId) === Number(origItem.id) ||
          (Boolean(s.itemName) && origItem.item_name === s.itemName && Number(origItem.unit_price) === Number(s.unitPrice))
      );
      const paidQty = selected ? Math.min(selected.quantity, origItem.quantity) : 0;
      const remainQty = origItem.quantity - paidQty;

      if (paidQty > 0) {
        paidTotal += paidQty * origItem.unit_price;
        paidOrderItems.push({
          ...origItem,
          id: Math.floor(Math.random() * 1000000),
          quantity: paidQty,
          subtotal: paidQty * origItem.unit_price,
        });
      }

      if (remainQty > 0) {
        remainingTotal += remainQty * origItem.unit_price;
        remainingOrderItems.push({
          ...origItem,
          quantity: remainQty,
          subtotal: remainQty * origItem.unit_price,
        });
      }
    }

    if (paidOrderItems.length === 0) {
      throw new Error('Chưa chọn món nào để thanh toán lẻ');
    }

    // Trường hợp 1: Nếu người dùng chọn TẤT CẢ các món -> Chỉ cần hoàn tất đơn gốc
    if (remainingOrderItems.length === 0) {
      const completed = await this.updateOrderStatus(
        originalOrderId,
        'completed',
        undefined,
        undefined,
        staffId
      );
      return { paidOrder: completed, remainingOrder: null };
    }

    // Trường hợp 2: Tách một phần món để thanh toán lẻ
    // 2.1. Tạo đơn hàng mới đã hoàn thành (cùng tên bàn với đơn cũ)
    const nextOrderId = Math.max(...orders.map((o) => Number(o.id) || 0), 0) + 1;
    const newOrderNumber = generateNextOrderNumber(orders);
    const tag = `[Thanh toán lẻ bàn ${originalOrder.table_name || 'Bàn 01'} - từ đơn ${originalOrder.order_number}] [Thu ngân: ${staffName}]`;
    const finalSplitNotes = notes ? `${tag} | ${notes}` : tag;
    const currentTableName = originalOrder.table_name || originalOrder.table?.name || 'Bàn 01';

    const currentLocalTimestamp = getLocalTimestamp();
    const newPaidOrder: Order = {
      id: nextOrderId,
      shift_id: originalOrder.shift_id || null,
      order_number: newOrderNumber,
      table_name: currentTableName,
      table: {
        id: nextOrderId,
        name: currentTableName,
        is_occupied: false,
      },
      order_type: originalOrder.order_type,
      created_by: originalOrder.created_by,
      creator: originalOrder.creator,
      completed_by: staffId,
      completer: staff || null,
      status: 'completed',
      payment_method: paymentMethod,
      total_amount: paidTotal,
      discount_amount: 0,
      final_amount: paidTotal,
      notes: finalSplitNotes,
      created_at: currentLocalTimestamp,
      completed_at: currentLocalTimestamp,
      items: paidOrderItems,
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      // Insert đơn mới
      const insertPayload: any = {
        shift_id: newPaidOrder.shift_id,
        order_number: newPaidOrder.order_number,
        table_name: currentTableName,
        order_type: newPaidOrder.order_type,
        created_by: toSafeUUID(originalOrder.created_by),
        completed_by: toSafeUUID(staffId),
        status: 'completed',
        payment_method: paymentMethod,
        total_amount: paidTotal,
        discount_amount: 0,
        final_amount: paidTotal,
        notes: finalSplitNotes,
        created_at: currentLocalTimestamp,
        completed_at: newPaidOrder.completed_at,
      };

      let { data: newOrderData, error: newOrderErr } = await supabase
        .from('orders')
        .insert(insertPayload)
        .select()
        .single();

      if (newOrderErr && newOrderErr.message?.includes('table_name')) {
        delete insertPayload.table_name;
        insertPayload['table'] = currentTableName;
        const retry = await supabase.from('orders').insert(insertPayload).select().single();
        newOrderData = retry.data;
        newOrderErr = retry.error;
      }

      if (newOrderData) {
        newPaidOrder.id = newOrderData.id;
        // Insert các món của đơn thanh toán lẻ
        await supabase.from('order_items').insert(
          paidOrderItems.map((item) => ({
            order_id: newOrderData.id,
            product_id: item.is_custom ? null : item.product_id,
            product_size_id: item.product_size_id,
            item_name: item.item_name,
            size_name: item.size_name,
            unit_price: item.unit_price,
            quantity: item.quantity,
            subtotal: item.subtotal,
            notes: item.notes,
            is_custom: item.is_custom,
            status: 'active',
          }))
        );

        // 2.2. Cập nhật các món và tổng tiền của đơn gốc trên Supabase
        for (const origItem of originalOrder.items || []) {
          const selected = selectedItems.find(
            (s) =>
              Number(s.itemId) === Number(origItem.id) ||
              (Boolean(s.itemName) && origItem.item_name === s.itemName && Number(origItem.unit_price) === Number(s.unitPrice))
          );
          if (selected) {
            const paidQty = Math.min(selected.quantity, origItem.quantity);
            const remainQty = origItem.quantity - paidQty;
            if (remainQty <= 0) {
              await supabase.from('order_items').delete().eq('id', origItem.id);
            } else {
              await supabase
                .from('order_items')
                .update({
                  quantity: remainQty,
                  subtotal: remainQty * origItem.unit_price,
                })
                .eq('id', origItem.id);
            }
          }
        }

        const remainingFinal = Math.max(0, remainingTotal - (originalOrder.discount_amount || 0));
        await supabase
          .from('orders')
          .update({
            total_amount: remainingTotal,
            final_amount: remainingFinal,
          })
          .eq('id', originalOrderId);
      }
    }

    // Cập nhật đơn gốc trong bộ nhớ / LocalStorage
    const remainingFinal = Math.max(0, remainingTotal - (originalOrder.discount_amount || 0));
    const updatedOriginalOrder: Order = {
      ...originalOrder,
      total_amount: remainingTotal,
      final_amount: remainingFinal,
      items: remainingOrderItems,
    };

    const updatedOrdersList = orders.map((o) => (o.id === originalOrderId ? updatedOriginalOrder : o));
    setLocal(STORAGE_KEYS.ORDERS, [newPaidOrder, ...updatedOrdersList]);

    return { paidOrder: newPaidOrder, remainingOrder: updatedOriginalOrder };
  },

  async removeOrderItem(
    orderId: number,
    itemId: number,
    reduceOnly = false
  ): Promise<Order | null> {
    const orders = await this.getOrders();
    const order = orders.find((o) => Number(o.id) === Number(orderId));
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    const itemIndex = (order.items || []).findIndex(
      (i) => Number(i.id) === Number(itemId)
    );
    if (itemIndex === -1) throw new Error('Không tìm thấy món cần xoá');

    const targetItem = order.items![itemIndex];
    let remainingItems: typeof order.items = [];

    if (reduceOnly && targetItem.quantity > 1) {
      const newQty = targetItem.quantity - 1;
      const newSubtotal = newQty * Number(targetItem.unit_price);
      const updatedItem = {
        ...targetItem,
        quantity: newQty,
        subtotal: newSubtotal,
      };

      remainingItems = order.items!.map((i, idx) =>
        idx === itemIndex ? updatedItem : i
      );

      if (this.isCloudConnected()) {
        const supabase = createClient();
        await supabase
          .from('order_items')
          .update({
            quantity: newQty,
            subtotal: newSubtotal,
          })
          .eq('id', itemId);
      }
    } else {
      // Xoá hoàn toàn món này
      remainingItems = order.items!.filter((_, idx) => idx !== itemIndex);

      if (this.isCloudConnected()) {
        const supabase = createClient();
        await supabase.from('order_items').delete().eq('id', itemId);
      }
    }

    // Nếu không còn món nào trong đơn
    if (remainingItems.length === 0) {
      await this.deleteOrder(orderId);
      return null;
    }

    const newTotal = remainingItems.reduce(
      (acc, i) => acc + (Number(i.subtotal) || Number(i.unit_price) * i.quantity),
      0
    );
    const newFinal = Math.max(0, newTotal - (order.discount_amount || 0));

    if (this.isCloudConnected()) {
      const supabase = createClient();
      await supabase
        .from('orders')
        .update({
          total_amount: newTotal,
          final_amount: newFinal,
        })
        .eq('id', orderId);
    }

    const updatedOrder: Order = {
      ...order,
      total_amount: newTotal,
      final_amount: newFinal,
      items: remainingItems,
    };

    const updatedOrders = orders.map((o) =>
      Number(o.id) === Number(orderId) ? updatedOrder : o
    );
    setLocal(STORAGE_KEYS.ORDERS, updatedOrders);

    return updatedOrder;
  },

  async deleteOrder(orderId: number): Promise<void> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      // Xoá các món trước để tránh vi phạm khoá ngoại
      await supabase.from('order_items').delete().eq('order_id', orderId);
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) {
        console.error('Lỗi Supabase khi xoá đơn hàng:', error);
        throw new Error('Lỗi khi xoá đơn hàng: ' + error.message);
      }
    }
    const orders = await this.getOrders();
    const updated = orders.filter((o) => o.id !== orderId);
    setLocal(STORAGE_KEYS.ORDERS, updated);
  },

  // -------------------------------------------------------------
  // CASH TRANSACTIONS (SỔ QUỸ)
  // -------------------------------------------------------------
  async getCashTransactions(): Promise<CashTransaction[]> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cash_transactions')
        .select(`*, profiles(id, full_name)`)
        .order('id', { ascending: false });
      if (!error && data) {
        return data.map((t: any) => {
          let createdAt = t.created_at;
          if (typeof createdAt === 'string' && (createdAt.includes('Z') || /\.\d+/.test(createdAt))) {
            const d = new Date(createdAt);
            if (!isNaN(d.getTime())) {
              createdAt = getLocalTimestamp(d);
            }
          }
          return { ...t, created_at: createdAt, creator: t.profiles };
        }) as CashTransaction[];
      }
      return [];
    }
    const local = getLocal<CashTransaction[]>(STORAGE_KEYS.CASH, initialCashTransactions);
    return local.map((t) => {
      let createdAt = t.created_at;
      if (typeof createdAt === 'string' && (createdAt.includes('Z') || /\.\d+/.test(createdAt))) {
        const d = new Date(createdAt);
        if (!isNaN(d.getTime())) {
          createdAt = getLocalTimestamp(d);
        }
      }
      return { ...t, created_at: createdAt };
    });
  },

  async createCashTransaction(data: {
    shiftId?: number;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    createdBy: string;
    transactionDate?: string;
  }): Promise<CashTransaction> {
    const list = await this.getCashTransactions();
    const profiles = await this.getProfiles();
    const creator = profiles.find((p) => p.id === data.createdBy) || profiles[0];
    const nextId = Math.max(...list.map((t) => t.id), 0) + 1;
    const dateStr = data.transactionDate || getLocalDateString();
    const currentLocalTimestamp = getLocalTimestamp();

    const newTxn: CashTransaction = {
      id: nextId,
      shift_id: data.shiftId || null,
      type: data.type,
      category: data.category,
      amount: data.amount,
      description: data.description,
      created_by: data.createdBy,
      creator,
      transaction_date: dateStr,
      created_at: currentLocalTimestamp,
    };

    if (this.isCloudConnected()) {
      const supabase = createClient();
      const { data: inserted } = await supabase
        .from('cash_transactions')
        .insert({
          shift_id: data.shiftId || null,
          type: data.type,
          category: data.category,
          amount: data.amount,
          description: data.description,
          created_by: toSafeUUID(data.createdBy),
          transaction_date: dateStr,
          created_at: currentLocalTimestamp,
        })
        .select()
        .single();
      if (inserted) newTxn.id = inserted.id;
    }

    setLocal(STORAGE_KEYS.CASH, [newTxn, ...list]);
    return newTxn;
  },

  async updateCashTransaction(
    id: number,
    data: {
      amount?: number;
      category?: string;
      description?: string;
      transactionDate?: string;
    }
  ): Promise<void> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      const payload: any = {};
      if (data.amount !== undefined) payload.amount = data.amount;
      if (data.category !== undefined) payload.category = data.category;
      if (data.description !== undefined) payload.description = data.description;
      if (data.transactionDate !== undefined) payload.transaction_date = data.transactionDate;
      const { error } = await supabase.from('cash_transactions').update(payload).eq('id', id);
      if (error) {
        console.error('Error updating cash transaction in Supabase:', error);
        throw new Error(error.message || 'Lỗi khi cập nhật phiếu chi trên cloud');
      }
    }
    const list = getLocal<CashTransaction[]>(STORAGE_KEYS.CASH, initialCashTransactions);
    const updated = list.map((t) => {
      if (t.id === id) {
        return {
          ...t,
          amount: data.amount !== undefined ? data.amount : t.amount,
          category: data.category !== undefined ? data.category : t.category,
          description: data.description !== undefined ? data.description : t.description,
          transaction_date: data.transactionDate !== undefined ? data.transactionDate : t.transaction_date,
        };
      }
      return t;
    });
    setLocal(STORAGE_KEYS.CASH, updated);
  },

  async deleteCashTransaction(id: number): Promise<void> {
    if (this.isCloudConnected()) {
      const supabase = createClient();
      await supabase.from('cash_transactions').delete().eq('id', id);
    }
    const list = await this.getCashTransactions();
    setLocal(STORAGE_KEYS.CASH, list.filter((t) => t.id !== id));
  },

  // -------------------------------------------------------------
  // RESET / RE-SEED FOR TESTING
  // -------------------------------------------------------------
  resetMockData(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.TABLES);
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.SHIFTS);
    localStorage.removeItem(STORAGE_KEYS.ORDERS);
    localStorage.removeItem(STORAGE_KEYS.CASH);
  },
};

