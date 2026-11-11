import { Category, Product, DiningTable, Profile, Shift, Order, CashTransaction } from '@/types/database';

export const initialCategories: Category[] = [
  { id: 1, name: 'Cà phê truyền thống', display_order: 1, is_active: true, created_at: new Date().toISOString() },
  { id: 2, name: 'Trà & Trà trái cây', display_order: 2, is_active: true, created_at: new Date().toISOString() },
  { id: 3, name: 'Đá xay & Sinh tố', display_order: 3, is_active: true, created_at: new Date().toISOString() },
  { id: 4, name: 'Nước ngọt & Đóng chai', display_order: 4, is_active: true, created_at: new Date().toISOString() },
  { id: 5, name: 'Bánh ngọt & Ăn nhẹ', display_order: 5, is_active: true, created_at: new Date().toISOString() },
];

export const initialProducts: Product[] = [
  {
    id: 1,
    category_id: 1,
    name: 'Cà phê đen đá',
    has_sizes: true,
    base_price: 20000,
    image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 1, product_id: 1, size_name: 'Size S (Vừa)', price: 20000, is_available: true, created_at: new Date().toISOString() },
      { id: 2, product_id: 1, size_name: 'Size M (Lớn)', price: 25000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 2,
    category_id: 1,
    name: 'Cà phê sữa đá',
    has_sizes: true,
    base_price: 25000,
    image_url: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 3, product_id: 2, size_name: 'Size S (Vừa)', price: 25000, is_available: true, created_at: new Date().toISOString() },
      { id: 4, product_id: 2, size_name: 'Size M (Lớn)', price: 30000, is_available: true, created_at: new Date().toISOString() },
      { id: 5, product_id: 2, size_name: 'Size L (Đặc biệt)', price: 35000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 3,
    category_id: 1,
    name: 'Bạc xỉu 3 tầng',
    has_sizes: true,
    base_price: 28000,
    image_url: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 6, product_id: 3, size_name: 'Size S', price: 28000, is_available: true, created_at: new Date().toISOString() },
      { id: 7, product_id: 3, size_name: 'Size M', price: 33000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 4,
    category_id: 1,
    name: 'Cà phê muối béo ngậy',
    has_sizes: true,
    base_price: 30000,
    image_url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 8, product_id: 4, size_name: 'Size S', price: 30000, is_available: true, created_at: new Date().toISOString() },
      { id: 9, product_id: 4, size_name: 'Size M', price: 35000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 5,
    category_id: 2,
    name: 'Trà đào cam sả',
    has_sizes: true,
    base_price: 32000,
    image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 10, product_id: 5, size_name: 'Size M', price: 32000, is_available: true, created_at: new Date().toISOString() },
      { id: 11, product_id: 5, size_name: 'Size L', price: 38000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 6,
    category_id: 2,
    name: 'Trà sen vàng củ năng',
    has_sizes: true,
    base_price: 35000,
    image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 12, product_id: 6, size_name: 'Size M', price: 35000, is_available: true, created_at: new Date().toISOString() },
      { id: 13, product_id: 6, size_name: 'Size L', price: 42000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 7,
    category_id: 3,
    name: 'Matcha đá xay kem cheese',
    has_sizes: true,
    base_price: 40000,
    image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
    sizes: [
      { id: 14, product_id: 7, size_name: 'Ly vừa', price: 40000, is_available: true, created_at: new Date().toISOString() },
      { id: 15, product_id: 7, size_name: 'Ly lớn', price: 48000, is_available: true, created_at: new Date().toISOString() },
    ],
  },
  {
    id: 8,
    category_id: 4,
    name: 'Coca Cola lon 320ml',
    has_sizes: false,
    base_price: 18000,
    image_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 9,
    category_id: 4,
    name: 'Bò húc Redbull lon',
    has_sizes: false,
    base_price: 20000,
    image_url: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 10,
    category_id: 5,
    name: 'Bánh Tiramisu cacao',
    has_sizes: false,
    base_price: 35000,
    image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
  },
  {
    id: 11,
    category_id: 5,
    name: 'Bánh sừng bò bơ Pháp',
    has_sizes: false,
    base_price: 28000,
    image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&auto=format&fit=crop&q=80',
    is_available: true,
    is_active: true,
    is_quick_created: false,
    created_at: new Date().toISOString(),
  },
];

export const initialTables: DiningTable[] = [];

export const initialProfiles: Profile[] = [];

export const initialShifts: Shift[] = [];

export const initialOrders: Order[] = [];

export const initialCashTransactions: CashTransaction[] = [];


