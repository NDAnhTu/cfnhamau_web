# Hệ Thống Quản Lý Quán Cà Phê (Coffee Shop POS & Management System)

Ứng dụng web quản lý quán cà phê hiện đại, được thiết kế và xây dựng chuẩn theo kế hoạch kỹ thuật:
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts (Biểu đồ), XLSX (Xuất Excel).
- **Backend & Database**: Mô hình BaaS với Supabase (PostgreSQL 15, Auth, Row Level Security, Realtime).
- **Giao diện**: Mobile-First POS cho nhân viên và Adaptive Dashboard cho chủ quán, hỗ trợ Dark Mode chuẩn WCAG AA.
- **Cơ chế hoạt động kép**: Kết nối trực tiếp Supabase Cloud khi có API keys, hoặc tự động kích hoạt chế độ Demo / Local Mock DB với dữ liệu mẫu hoàn chỉnh để kiểm thử toàn diện ngay lập tức mà không cần cấu hình phức tạp.

---

## 1. Cấu Trúc Dự Án

```
cfnhamau_web/
├── public/                     # Favicon, SVG icon, manifest.json (PWA)
├── supabase/
│   └── schema.sql              # Script SQL khởi tạo 9 bảng, RLS, Indexes và Trigger
├── src/
│   ├── app/
│   │   ├── (auth)/login/       # Màn hình đăng nhập & chuyển nhanh tài khoản demo
│   │   ├── pos/
│   │   │   ├── page.tsx        # Màn hình POS bán hàng (Split view tablet/desktop, bottom bar mobile)
│   │   │   └── orders/page.tsx # Màn hình quản lý đơn trong ngày & hủy đơn (có lý do)
│   │   ├── shift/page.tsx      # Mở ca, tạo phiếu chi vặt trong ca & chốt két kiểm tiền
│   │   ├── admin/
│   │   │   ├── dashboard/      # Báo cáo doanh thu, biểu đồ theo giờ, top 5 món
│   │   │   ├── menu/           # Quản lý thực đơn, kích cỡ (size) & Quick Switch hết hàng
│   │   │   ├── orders/         # Lịch sử đơn hàng, xem snapshot giá & xuất Excel (.xlsx)
│   │   │   ├── cash-flow/      # Sổ quỹ thu chi ngoài & kiểm duyệt ca (highlight lệch két)
│   │   │   └── staff/          # Quản lý tài khoản nhân viên, phân quyền Owner/Staff
│   │   ├── api/admin/create-user/ # API Serverless tạo user Supabase Auth
│   │   ├── globals.css         # Hệ thống màu sắc Dark Mode & Light Mode
│   │   ├── layout.tsx          # Root layout với Navbar và Auth/Theme Provider
│   │   └── page.tsx            # Trang chủ điều hướng các phân hệ
│   ├── components/
│   │   ├── Navbar.tsx          # Thanh điều hướng, đổi Dark mode & chuyển vai trò test
│   │   ├── pos/                # ProductCard, CategoryChips, SizeSelectorModal, CustomItemModal, CartView, PaymentModal
│   │   └── admin/              # AdminNav
│   ├── context/
│   │   ├── AuthContext.tsx     # Quản lý phiên làm việc & phân quyền (Owner vs Staff)
│   │   └── ThemeContext.tsx    # Chuyển đổi Dark/Light mode chuẩn WCAG AA
│   ├── lib/
│   │   ├── supabase/           # Client & Server clients cho Supabase
│   │   ├── data-service.ts     # Tầng xử lý dữ liệu thông minh (Cloud + Local Fallback)
│   │   ├── mock-data.ts        # Dữ liệu ban đầu (Menu, Bàn 1-10, Ca làm, Đơn hàng)
│   │   └── utils.ts            # formatCurrency (VNĐ), formatDateTime, VietQR URL
│   └── types/database.ts       # Cấu trúc TypeScript cho toàn bộ 9 bảng
├── .env.local                  # Biến môi trường kết nối Supabase & VietQR
├── package.json
└── tsconfig.json
```

---

## 2. Hướng Dẫn Kết Nối Cơ Sở Dữ Liệu (Supabase)

### Bước 1: Tạo dự án trên Supabase
1. Truy cập [supabase.com](https://supabase.com) và đăng nhập bằng tài khoản GitHub hoặc Google.
2. Nhấn **New Project**:
   - **Name**: `coffee-pos` (hoặc tên tuỳ chọn).
   - **Database Password**: Đặt mật khẩu và lưu lại.
   - **Region**: Chọn **Singapore (ap-southeast-1)** để độ trễ thấp nhất từ Việt Nam.
   - **Pricing Plan**: Chọn **Free tier**.

### Bước 2: Chạy Script Khởi Tạo Database Schema
1. Trong màn hình Supabase Dashboard, chọn mục **SQL Editor** (biểu tượng `>_` ở menu bên trái).
2. Nhấn **New Query**.
3. Mở file `supabase/schema.sql` trong dự án này, copy toàn bộ nội dung và dán vào SQL Editor.
4. Nhấn **Run** để khởi tạo:
   - 9 bảng dữ liệu: `profiles`, `categories`, `products`, `product_sizes`, `tables`, `shifts`, `orders`, `order_items`, `cash_transactions`.
   - Các Triggers tự động đồng bộ tài khoản người dùng (`handle_new_user`).
   - Các Indexes tăng tốc độ báo cáo doanh thu.
   - Toàn bộ chính sách bảo mật dòng (Row Level Security - RLS) phân quyền Owner và Staff.
   - Dữ liệu menu mẫu ban đầu (Cà phê sữa đá, Bạc xỉu, Trà sen vàng, Matcha đá xay, Bàn 01-10).

### Bước 3: Điền Thông Tin Kết Nối Vào File `.env.local`
1. Vào mục **Project Settings** (biểu tượng bánh răng) -> chọn mục **API**.
2. Sao chép các giá trị và dán vào file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Cấu hình ngân hàng VietQR của quán
NEXT_PUBLIC_VIETQR_BANK_ID=MB
NEXT_PUBLIC_VIETQR_ACCOUNT_NO=0388888888
NEXT_PUBLIC_VIETQR_ACCOUNT_NAME=NGUYEN VAN A
```

---

## 3. Chạy Ứng Dụng Trên Máy Cục Bộ

Chạy lệnh trong thư mục dự án:
```bash
npm run dev
```
Mở trình duyệt truy cập: **`http://localhost:3000`**

*(Hệ thống đã build thành công production bundle qua lệnh `npm run build` với 0 lỗi).*

---

## 4. Hướng Dẫn Kiểm Thử Đầy Đủ Chức Năng (Testing Guide)

Trên thanh Navbar ở góc phải trên cùng, có sẵn nút **Chuyển nhanh tài khoản test**:
- **Nguyễn Văn Chủ (Chủ quán)**: Kiểm thử Dashboard doanh thu, quản lý menu, sổ quỹ và nhân sự.
- **Trần Thị Thu Ngân (Nhân viên thu ngân)**: Kiểm thử POS đặt món, in bếp, thanh toán VietQR và chốt két.
- **Nút "Reset Dữ Liệu Kiểm Thử"**: Đưa toàn bộ đơn hàng và menu về trạng thái mẫu ban đầu bất kỳ lúc nào.

### Kịch bản 1: Mở ca và Bán hàng POS (`/pos`)
1. Vào trang **Mở / Chốt Ca** (`/shift`), nhập số tiền dằn két ban đầu (ví dụ: `500.000 đ`), bấm **Vào Ca Làm Việc**.
2. Sang trang **POS Đặt Món** (`/pos`):
   - Chọn danh mục: *Cà phê truyền thống*, *Trà trái cây*, v.v.
   - Bấm vào món có size như *Cà phê sữa đá* -> Bottom sheet mở ra cho chọn Size S / M / L kèm phụ thu, chọn tag pha chế nhanh (*Ít đá*, *Ít ngọt*, *Mang đi*), bấm **Thêm vào đơn**.
   - Bấm vào món không có size như *Coca Cola lon* -> Món tự động vào giỏ ngay lập tức.
   - Bấm nút **+ Món Custom**: Tự gõ tên món (VD: *Nước ép cam sành tươi*), đơn giá `30.000 đ`, bật công tắc *Lưu món này vào Menu quán*, bấm **Thêm vào giỏ**. Món này sẽ lưu trực tiếp vào danh mục menu!
3. Trong giỏ hàng:
   - Chọn bàn: Bàn 01 hoặc Mang về (Takeaway).
   - Thêm giảm giá (chiết khấu) nếu cần.
   - Bấm **Lưu Tạm (In Bếp)** -> Đơn được tạo với trạng thái Chờ làm (`pending`).
   - Bấm **Thanh Toán**:
     - *Tab Tiền mặt*: Bấm các nút gợi ý tiền đưa `100.000đ`, `200.000đ` -> Hệ thống tự động tính tiền thối lại cho khách.
     - *Tab Chuyển khoản (VietQR)*: Hiển thị ngay mã QR động Napas 247 đúng số tiền và nội dung đơn. Bấm **Xác nhận đã nhận tiền** -> Đơn hoàn tất!

### Kịch bản 2: Quản lý Đơn hàng & Hủy đơn (`/pos/orders`)
1. Vào trang **Đơn Hàng**:
   - Tab **Chờ làm**: Bấm vào đơn vừa lưu tạm -> Bấm **Xác Nhận Thanh Toán Hoàn Tất** khi khách thanh toán sau.
   - Nút **Hủy Đơn Hàng Này**: Bật popup yêu cầu bắt buộc chọn lý do hủy (*Khách đổi ý*, *Nhập nhầm món*, *Hết đá/nguyên liệu*...). Đơn chuyển sang trạng thái `cancelled` và lý do được lưu vào hệ thống để chủ quán kiểm tra.

### Kịch bản 3: Quản lý Ca làm việc & Chốt két (`/shift`)
1. Bấm **+ Phiếu Chi Vặt**: Lập phiếu chi mua đá bi `35.000 đ`. Số tiền két lý thuyết sẽ tự động trừ đi `35.000 đ`.
2. Bấm **Chốt Ca & Bàn Giao**:
   - Hệ thống hiển thị số tiền lý thuyết: `Đầu ca + Tiền mặt bán được - Chi phí phát sinh`.
   - Nhập số tiền thực tế nhân viên đếm được trong két.
   - Hệ thống tự động tính chênh lệch:
     - Nếu khớp 100%: Hiện màu xanh lá.
     - Nếu thiếu hụt: Cảnh báo chữ đỏ **Hụt két**.
   - Bấm **Xác Nhận Chốt Ca** để lưu vào lịch sử bàn giao ca.

### Kịch bản 4: Dashboard Quản lý Doanh thu của Chủ quán (`/admin/dashboard`)
1. Xem hàng thẻ KPI: Doanh thu thực thu, tỷ lệ đơn Tại chỗ vs Mang đi, tỷ trọng Tiền mặt vs VietQR.
2. Xem **Biểu đồ đường (Line chart)** phân bổ doanh thu theo từng khung giờ trong ngày để phát hiện giờ cao điểm.
3. Xem **Biểu đồ tròn (Donut chart)** tỷ trọng doanh thu theo từng nhóm đồ uống.
4. Xem **Bảng xếp hạng Top 5 món bán chạy nhất quán**.

### Kịch bản 5: Quản trị Thực đơn & Size (`/admin/menu`)
1. Bấm công tắc **Quick Switch (Còn hàng / Tạm hết)** trực tiếp trên bảng mà không cần vào trang sửa.
2. Bấm **+ Thêm Món Mới**: Thêm món có nhiều size (S/M/L) với bảng giá động hoặc món giá cố định.
3. Thử nút xóa món: Thực hiện Soft delete (`is_active = false`), đảm bảo an toàn toàn vẹn dữ liệu cho các hóa đơn cũ trong quá khứ.

### Kịch bản 6: Tra cứu Đơn hàng & Xuất Excel (`/admin/orders`)
1. Thử bộ lọc: Lọc theo ngày, nhân viên đứng ca, hình thức thanh toán, trạng thái đơn.
2. Bấm nút **Xuất Báo Cáo Excel (.xlsx)**: File Excel tải về máy tính chứa đầy đủ chi tiết tên món snapshot, đơn giá tại thời điểm order, thành tiền và lý do hủy để làm sổ sách kế toán.

### Kịch bản 7: Quản lý Nhân sự & Khóa tài khoản (`/admin/staff`)
1. Bấm **+ Thêm Tài Khoản Mới**: Tạo tài khoản với vai trò Owner hoặc Staff.
2. Bấm **Khóa tài khoản** (`is_active = false`) khi nhân viên nghỉ việc để chặn truy cập.

