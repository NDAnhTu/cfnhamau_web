export type UserRole = 'owner' | 'staff';

export interface Profile {
  id: string; // uuid
  full_name: string;
  role: UserRole;
  phone?: string | null;
  email?: string | null;
  password?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ProductSize {
  id: number;
  product_id: number;
  size_name: string;
  price: number;
  is_available: boolean;
  created_at: string;
}

export interface Product {
  id: number;
  category_id: number | null;
  name: string;
  has_sizes: boolean;
  base_price: number;
  image_url?: string | null;
  is_available: boolean;
  is_active: boolean;
  is_quick_created: boolean;
  created_at: string;
  category?: Category;
  sizes?: ProductSize[];
}

export interface DiningTable {
  id?: number;
  name: string;
  is_occupied?: boolean;
  active_order?: Order | null;
}

export interface ActiveTableInfo {
  table: DiningTable;
  activeOrder: Order | null;
  elapsedMinutes: number;
  totalAmount: number;
  itemsCount: number;
}

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: number;
  staff_id: string;
  staff?: Profile;
  start_time: string;
  end_time?: string | null;
  starting_cash: number;
  ending_cash_system?: number | null;
  ending_cash_actual?: number | null;
  difference?: number | null;
  status: ShiftStatus;
  notes?: string | null;
}

export type OrderStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'vietqr';
export type OrderType = 'dine_in' | 'takeaway';

export interface OrderItem {
  id: number;
  order_id: number;
  product_id?: number | null;
  product_size_id?: number | null;
  item_name: string;
  size_name?: string | null;
  unit_price: number;
  quantity: number;
  subtotal: number;
  notes?: string | null;
  is_custom: boolean;
  status: 'active' | 'cancelled';
  cancel_reason?: string | null;
}

export interface Order {
  id: number;
  shift_id?: number | null;
  order_number: string;
  table_name?: string | null;
  table_id?: number | null;
  table?: DiningTable;
  order_type: OrderType;
  created_by: string;
  creator?: Profile;
  status: OrderStatus;
  payment_method: PaymentMethod;
  total_amount: number;
  discount_amount: number;
  final_amount: number;
  notes?: string | null;
  cancel_reason?: string | null;
  cancelled_by?: string | null;
  completed_by?: string | null;
  completer?: Profile | null;
  created_at: string;
  completed_at?: string | null;
  items?: OrderItem[];
}

export type TransactionType = 'income' | 'expense';
export type CashCategory = 'tien_da' | 'dien_nuoc' | 'nguyen_lieu_phu' | 'mat_bang' | 'khac';

export interface CashTransaction {
  id: number;
  shift_id?: number | null;
  type: TransactionType;
  category: CashCategory | string;
  amount: number;
  description: string;
  created_by: string;
  creator?: Profile;
  transaction_date: string;
  created_at: string;
}

export interface CartItem {
  tempId: string;
  productId?: number | null;
  sizeId?: number | null;
  name: string;
  sizeName?: string | null;
  price: number;
  quantity: number;
  notes?: string;
  isCustom?: boolean;
}

