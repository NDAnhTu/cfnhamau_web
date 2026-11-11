-- =========================================================================
-- CF NHÀ MÀU - SCRIPT KÍCH HOẠT DỮ LIỆU MẪU & REALTIME CHO SUPABASE
-- Dành cho dự án đã tạo sẵn cấu trúc bảng từ schema của bạn.
-- Hướng dẫn: Copy toàn bộ nội dung file này dán vào SQL Editor trên Supabase và bấm RUN.
-- =========================================================================

-- 1. TRIGGER TỰ ĐỘNG ĐỒNG BỘ TÀI KHOẢN TỪ AUTH.USERS SANG PROFILES
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, phone)
  VALUES (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', 'Nhân viên mới'), 
    coalesce(new.raw_user_meta_data->>'role', 'staff'),
    new.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = coalesce(excluded.role, profiles.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. KÍCH HOẠT REALTIME REPLICATION (CHO SƠ ĐỒ BÀN & ĐƠN HÀNG TRỰC TIẾP)
-- Đảm bảo thay đổi ở bảng orders và tables sẽ bắn socket về màn hình Web ngay lập tức
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.tables REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'tables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tables;
  END IF;
END $$;


-- 3. THIẾT LẬP CHÍNH SÁCH ROW LEVEL SECURITY (RLS) ĐỂ TEST MƯỢT MÀ
-- Cho phép đọc/ghi dữ liệu trong môi trường phát triển & kiểm thử
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- Tạo policy mở cho authenticated và anon (dành cho client API key)
DROP POLICY IF EXISTS "Cho phép đọc categories" ON public.categories;
CREATE POLICY "Cho phép đọc categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc products" ON public.products;
CREATE POLICY "Cho phép đọc products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép đọc product_sizes" ON public.product_sizes;
CREATE POLICY "Cho phép đọc product_sizes" ON public.product_sizes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thao tác tables" ON public.tables;
CREATE POLICY "Cho phép thao tác tables" ON public.tables FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thao tác profiles" ON public.profiles;
CREATE POLICY "Cho phép thao tác profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thao tác shifts" ON public.shifts;
CREATE POLICY "Cho phép thao tác shifts" ON public.shifts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thao tác orders" ON public.orders;
CREATE POLICY "Cho phép thao tác orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thao tác order_items" ON public.order_items;
CREATE POLICY "Cho phép thao tác order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Cho phép thao tác cash_transactions" ON public.cash_transactions;
CREATE POLICY "Cho phép thao tác cash_transactions" ON public.cash_transactions FOR ALL USING (true) WITH CHECK (true);


-- 4. DỮ LIỆU KHỞI TẠO MẪU (SEED DATA TƯƠNG THÍCH IDENTITY COLUMN)

-- 4.1 Danh sách Bàn ban đầu (Tên bàn là UNIQUE)
INSERT INTO public.tables (name, is_occupied) VALUES
  ('Mang về (Takeaway)', false),
  ('Bàn 01', false),
  ('Bàn 02', false),
  ('Bàn 03', false),
  ('Bàn 04', false),
  ('Bàn 05', false),
  ('Bàn 06', false),
  ('Bàn 07', false),
  ('Bàn 08', false),
  ('Bàn 09', false),
  ('Bàn 10', false)
ON CONFLICT (name) DO NOTHING;

-- 4.2 Danh mục món (Categories)
INSERT INTO public.categories (name, display_order, is_active) VALUES
  ('Cà phê truyền thống', 1, true),
  ('Trà & Trà trái cây', 2, true),
  ('Đá xay & Sinh tố', 3, true),
  ('Nước ngọt & Đóng chai', 4, true),
  ('Bánh ngọt & Ăn nhẹ', 5, true)
ON CONFLICT (name) DO NOTHING;

-- 4.3 Sản phẩm mẫu (Products)
INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Cà phê đen đá', true, 20000, true, true FROM public.categories WHERE name = 'Cà phê truyền thống'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Cà phê đen đá');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Cà phê sữa đá', true, 25000, true, true FROM public.categories WHERE name = 'Cà phê truyền thống'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Cà phê sữa đá');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Bạc xỉu 3 tầng', true, 28000, true, true FROM public.categories WHERE name = 'Cà phê truyền thống'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Bạc xỉu 3 tầng');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Cà phê muối béo ngậy', true, 30000, true, true FROM public.categories WHERE name = 'Cà phê truyền thống'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Cà phê muối béo ngậy');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Trà đào cam sả', true, 32000, true, true FROM public.categories WHERE name = 'Trà & Trà trái cây'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Trà đào cam sả');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Trà sen vàng củ năng', true, 35000, true, true FROM public.categories WHERE name = 'Trà & Trà trái cây'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Trà sen vàng củ năng');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Matcha đá xay kem cheese', true, 40000, true, true FROM public.categories WHERE name = 'Đá xay & Sinh tố'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Matcha đá xay kem cheese');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Coca Cola lon 320ml', false, 18000, true, true FROM public.categories WHERE name = 'Nước ngọt & Đóng chai'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Coca Cola lon 320ml');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Bò húc Redbull lon', false, 20000, true, true FROM public.categories WHERE name = 'Nước ngọt & Đóng chai'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Bò húc Redbull lon');

INSERT INTO public.products (category_id, name, has_sizes, base_price, is_available, is_active)
SELECT id, 'Bánh Tiramisu cacao', false, 35000, true, true FROM public.categories WHERE name = 'Bánh ngọt & Ăn nhẹ'
AND NOT EXISTS (SELECT 1 FROM public.products WHERE name = 'Bánh Tiramisu cacao');

-- 4.4 Kích cỡ & giá các món (Product Sizes)
INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size S (Vừa)', 20000 FROM public.products p WHERE p.name = 'Cà phê đen đá'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size S (Vừa)');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size M (Lớn)', 25000 FROM public.products p WHERE p.name = 'Cà phê đen đá'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size M (Lớn)');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size S (Vừa)', 25000 FROM public.products p WHERE p.name = 'Cà phê sữa đá'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size S (Vừa)');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size M (Lớn)', 30000 FROM public.products p WHERE p.name = 'Cà phê sữa đá'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size M (Lớn)');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size L (Đặc biệt)', 35000 FROM public.products p WHERE p.name = 'Cà phê sữa đá'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size L (Đặc biệt)');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size S', 28000 FROM public.products p WHERE p.name = 'Bạc xỉu 3 tầng'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size S');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size M', 33000 FROM public.products p WHERE p.name = 'Bạc xỉu 3 tầng'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size M');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size S', 30000 FROM public.products p WHERE p.name = 'Cà phê muối béo ngậy'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size S');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size M', 35000 FROM public.products p WHERE p.name = 'Cà phê muối béo ngậy'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size M');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size M', 32000 FROM public.products p WHERE p.name = 'Trà đào cam sả'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size M');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Size L', 38000 FROM public.products p WHERE p.name = 'Trà đào cam sả'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Size L');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Ly vừa', 40000 FROM public.products p WHERE p.name = 'Matcha đá xay kem cheese'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Ly vừa');

INSERT INTO public.product_sizes (product_id, size_name, price)
SELECT p.id, 'Ly lớn', 48000 FROM public.products p WHERE p.name = 'Matcha đá xay kem cheese'
AND NOT EXISTS (SELECT 1 FROM public.product_sizes ps WHERE ps.product_id = p.id AND ps.size_name = 'Ly lớn');

