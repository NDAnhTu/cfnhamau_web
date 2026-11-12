'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Category,
  Product,
  DiningTable,
  CartItem,
  Shift,
  OrderType,
  PaymentMethod,
  ActiveTableInfo,
  Order,
} from '@/types/database';
import { DataService, PENDING_PAYMENT_CONFIRMATION_TAG, isAwaitingPaymentConfirmation } from '@/lib/data-service';
import { useAuth } from '@/context/AuthContext';
import { useDateFilter } from '@/context/DateFilterContext';
import { generateOrderNumber, formatCurrency, getLocalDateString } from '@/lib/utils';
import { CategoryChips } from '@/components/pos/CategoryChips';
import { ProductCard } from '@/components/pos/ProductCard';
import { SizeSelectorModal } from '@/components/pos/SizeSelectorModal';
import { CustomItemModal } from '@/components/pos/CustomItemModal';
import { CartView } from '@/components/pos/CartView';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { TableGrid } from '@/components/pos/TableGrid';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { PosAdminTabs } from '@/components/pos/PosAdminTabs';
import {
  Search,
  Sparkles,
  ShoppingBag,
  Clock,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  UtensilsCrossed,
  CheckCircle,
  CheckCircle2,
  LayoutGrid,
  Coffee,
  Receipt,
  User,
} from 'lucide-react';

export default function PosPage() {
  const { user, isStaff } = useAuth();
  const { selectedDate, displayDate } = useDateFilter();

  // Navigation mode: 'tables' (Sơ đồ bàn) vs 'menu' (POS chọn món)
  const [posViewMode, setPosViewMode] = useState<'tables' | 'menu'>('tables');

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [activeTablesList, setActiveTablesList] = useState<ActiveTableInfo[]>([]);

  // POS Order form state
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableName, setTableName] = useState<string>('Bàn 01');
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [existingOrderId, setExistingOrderId] = useState<number | null>(null);

  // Modals state
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Checkout modal targeting
  const [checkoutTarget, setCheckoutTarget] = useState<{
    orderId?: number;
    orderNumber: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    tableName: string;
    tableId: number;
    orderType: OrderType;
    order?: Order | null;
  } | null>(null);

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [unconfirmedCount, setUnconfirmedCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);

  useEffect(() => {
    loadData();

    // Subscribe to realtime changes on orders & tables
    const unsubscribe = DataService.subscribeToTablesAndOrders(() => {
      loadData();
    });

    return () => {
      unsubscribe();
    };
  }, [user, selectedDate]);

  const loadData = async () => {
    const [cats, prods, activeTbls, allOrders] = await Promise.all([
      DataService.getCategories(),
      DataService.getProducts(true),
      DataService.getActiveTablesWithOrders(selectedDate),
      DataService.getOrders(),
    ]);
    setCategories(cats.filter((c) => c.is_active));
    setProducts(prods);
    setActiveTablesList(activeTbls);

    const dateMatchedOrders = allOrders.filter((o) => {
      if (selectedDate && !o.created_at.startsWith(selectedDate) && getLocalDateString(o.created_at) !== selectedDate) {
        return false;
      }
      return true;
    });

    setUnconfirmedCount(
      dateMatchedOrders.filter((o) => isAwaitingPaymentConfirmation(o)).length
    );
    setCompletedCount(
      dateMatchedOrders.filter((o) => o.status === 'completed' && !isAwaitingPaymentConfirmation(o)).length
    );
  };

  // Filtered products
  const filteredProducts = products.filter((prod) => {
    const matchesCategory =
      selectedCategoryId === null || prod.category_id === selectedCategoryId;
    const matchesSearch =
      !searchQuery.trim() ||
      prod.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCategory && matchesSearch;
  });

  // Precompute quantity of each product currently in cart
  const productQuantityMap = React.useMemo(() => {
    const map: Record<number, number> = {};
    for (const item of cart) {
      if (item.productId != null) {
        map[item.productId] = (map[item.productId] || 0) + item.quantity;
      }
    }
    return map;
  }, [cart]);

  const handleProductClick = (product: Product) => {
    if (product.has_sizes && product.sizes && product.sizes.length > 0) {
      const existingItems = cart.filter((i) => i.productId === product.id);
      // If exactly 1 size variant is in cart, clicking the image/card increments it by 1
      if (existingItems.length === 1) {
        handleUpdateQuantity(existingItems[0].tempId, 1);
        return;
      }
      // Otherwise open size selector to choose size
      setCustomizingProduct(product);
    } else {
      // If product is already in cart, increment quantity by 1
      const existing = cart.find((i) => i.productId === product.id && !i.isCustom);
      if (existing) {
        handleUpdateQuantity(existing.tempId, 1);
        return;
      }

      // Add directly
      const item: CartItem = {
        tempId: `${product.id}-${Date.now()}`,
        productId: product.id,
        name: product.name,
        price: product.base_price,
        quantity: 1,
        isCustom: false,
      };
      handleAddToCart(item);
    }
  };

  const handleIncrementProduct = (product: Product) => {
    handleProductClick(product);
  };

  const handleDecrementProduct = (product: Product) => {
    setCart((prev) => {
      const matches = prev.filter((i) => i.productId === product.id);
      if (matches.length === 0) return prev;

      // Decrement the last matching item of this product
      const lastItem = matches[matches.length - 1];
      if (lastItem.quantity > 1) {
        return prev.map((item) =>
          item.tempId === lastItem.tempId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      } else {
        return prev.filter((item) => item.tempId !== lastItem.tempId);
      }
    });
  };

  const handleOpenCustomizer = (product: Product) => {
    setCustomizingProduct(product);
  };

  const handleAddToCart = (item: CartItem) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (p) =>
          p.productId === item.productId &&
          p.sizeId === item.sizeId &&
          p.notes === item.notes &&
          !item.isCustom
      );
      if (existingIdx >= 0) {
        return prev.map((p, idx) =>
          idx === existingIdx
            ? { ...p, quantity: p.quantity + item.quantity }
            : p
        );
      }
      return [...prev, item];
    });
  };

  const handleUpdateQuantity = (tempId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.tempId === tempId) {
            const newQ = item.quantity + delta;
            return newQ > 0 ? { ...item, quantity: newQ } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveItem = (tempId: string) => {
    setCart((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const handleClearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setExistingOrderId(null);
  };

  // -------------------------------------------------------------
  // TABLE GRID ACTIONS
  // -------------------------------------------------------------
  const handleSelectEmptyTable = (tblName: string) => {
    setTableName(tblName);
    setOrderType('dine_in');
    setExistingOrderId(null);
    setCart([]);
    setPosViewMode('menu');
  };

  const handleQuickNewTable = (tblName: string, isTakeaway = false) => {
    setTableName(isTakeaway ? 'Mang về' : tblName);
    setOrderType(isTakeaway ? 'takeaway' : 'dine_in');
    setExistingOrderId(null);
    setCart([]);
    setPosViewMode('menu');
  };

  const handleAddMoreItems = (tableInfo: ActiveTableInfo) => {
    setTableName(tableInfo.table.name);
    setOrderType(tableInfo.activeOrder?.order_type || 'dine_in');
    setExistingOrderId(tableInfo.activeOrder?.id || null);
    setCart([]);
    setPosViewMode('menu');
    setSuccessBanner(`Đang gọi thêm món cho ${tableInfo.table.name} (Đơn ${tableInfo.activeOrder?.order_number})`);
    setTimeout(() => setSuccessBanner(null), 5000);
  };

  const handleCheckoutTableFromGrid = (tableInfo: ActiveTableInfo) => {
    if (!tableInfo.activeOrder) return;
    setCheckoutTarget({
      orderId: tableInfo.activeOrder.id,
      orderNumber: tableInfo.activeOrder.order_number,
      totalAmount: tableInfo.activeOrder.total_amount,
      discountAmount: tableInfo.activeOrder.discount_amount,
      finalAmount: tableInfo.activeOrder.final_amount,
      tableName: tableInfo.table.name,
      tableId: tableInfo.table.id || 0,
      orderType: tableInfo.activeOrder.order_type,
      order: tableInfo.activeOrder,
    });
    setIsPaymentModalOpen(true);
  };

  const handleSplitAndPayOrder = async (
    selectedItems: { itemId: number; quantity: number; itemName?: string; unitPrice?: number }[],
    paymentMethod: PaymentMethod,
    notes?: string
  ) => {
    if (!checkoutTarget?.orderId) return;

    const confirmationTag = isStaff ? PENDING_PAYMENT_CONFIRMATION_TAG : '';
    const finalSplitNotes = [confirmationTag, notes].filter(Boolean).join(' ').trim() || undefined;

    const result = await DataService.splitAndPayOrder({
      originalOrderId: checkoutTarget.orderId,
      selectedItems,
      paymentMethod,
      staffId: user?.id || '',
      notes: finalSplitNotes,
    });

    setSuccessBanner(
      `Đã thanh toán lẻ thành công.`
    );
    handleClearCart();
    setIsMobileCartOpen(false);
    setCheckoutTarget(null);
    setPosViewMode('tables');
    await loadData();
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const handleDeleteOrderFromPayment = async () => {
    if (!checkoutTarget) return;

    if (!checkoutTarget.orderId) {
      handleClearCart();
      setIsPaymentModalOpen(false);
      setCheckoutTarget(null);
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn đơn ${checkoutTarget.orderNumber} của bàn "${checkoutTarget.tableName}" không? Hành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      await DataService.deleteOrder(checkoutTarget.orderId);
      setSuccessBanner(`Đã xóa vĩnh viễn đơn hàng của bàn "${checkoutTarget.tableName}" thành công!`);
      setIsPaymentModalOpen(false);
      setCheckoutTarget(null);
      handleClearCart();
      await loadData();
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (e: any) {
      alert('Lỗi xóa đơn hàng: ' + e.message);
    }
  };

  // -------------------------------------------------------------
  // CHECKOUT & SAVE PENDING ACTIONS
  // -------------------------------------------------------------
  const handleOpenPaymentFromCart = async () => {
    const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const final = Math.max(0, subtotal - discountAmount);
    const currentTableName = orderType === 'takeaway' ? 'Mang về' : (tableName.trim() || 'Bàn 01');

    setCheckoutTarget({
      orderId: existingOrderId || undefined,
      orderNumber: generateOrderNumber(),
      totalAmount: subtotal,
      discountAmount,
      finalAmount: final,
      tableName: currentTableName,
      tableId: 0,
      orderType,
    });
    setIsPaymentModalOpen(true);
  };

  const handleSavePending = async () => {
    if (cart.length === 0) return;
    setIsSavingPending(true);
    try {
      const currentTableName = orderType === 'takeaway' ? 'Mang về' : (tableName.trim() || 'Bàn 01');

      if (existingOrderId) {
        // Appending drinks to an active order of this table with current user attribution
        await DataService.addItemsToExistingOrder(existingOrderId, cart, user?.id, user?.full_name);
        const orderLabel = orderType === 'takeaway' ? 'đơn Mang về' : `bàn "${currentTableName}"`;
        setSuccessBanner(`Đã cập nhật thêm món thành công vào ${orderLabel}!`);
      } else {
        // Creating a new active table order
        const newOrder = await DataService.createOrder({
          tableName: currentTableName,
          orderType,
          cartItems: cart,
          discountAmount,
          paymentMethod: 'cash',
          status: 'pending',
          notes: `Đơn ${orderType === 'takeaway' ? 'mang về' : 'bàn ' + currentTableName}`,
          staffId: user?.id || '',
        });

        const orderLabel = orderType === 'takeaway' ? 'Mang về' : `bàn "${currentTableName}"`;
        setSuccessBanner(`Đã lưu đơn ${newOrder.order_number} (${orderLabel}) và chuyển bếp thành công!`);
      }

      handleClearCart();
      setIsMobileCartOpen(false);

      // KEY REQUIREMENT: Automatically switch to active tables screen!
      setPosViewMode('tables');
      await loadData();
      setTimeout(() => setSuccessBanner(null), 6000);
    } catch (e: any) {
      alert('Lỗi lưu đơn bàn: ' + e.message);
    } finally {
      setIsSavingPending(false);
    }
  };

  const handleCompletePayment = async (paymentMethod: PaymentMethod, notes?: string) => {
    if (!checkoutTarget) return;

    const confirmationTag = isStaff ? PENDING_PAYMENT_CONFIRMATION_TAG : '';
    const finalOrderNotes = [confirmationTag, notes].filter(Boolean).join(' ').trim() || undefined;

    if (checkoutTarget.orderId) {
      // Completed an existing pending order with current user as completedBy
      await DataService.updateOrderStatus(
        checkoutTarget.orderId,
        'completed',
        undefined,
        undefined,
        user?.id,
        finalOrderNotes
      );
      setSuccessBanner(
        isStaff
          ? `Bàn "${checkoutTarget.tableName}" đã thanh toán!`
          : `Bàn ${checkoutTarget.tableName} đã thanh toán hoàn tất!`
      );
    } else {
      // Completed directly from cart
      const newOrder = await DataService.createOrder({
        tableName: checkoutTarget.tableName,
        orderType: checkoutTarget.orderType,
        cartItems: cart,
        discountAmount,
        paymentMethod,
        status: 'completed',
        notes: finalOrderNotes,
        staffId: user?.id || '',
      });
      setSuccessBanner(
        isStaff
          ? `Đơn ${newOrder.order_number} của "${checkoutTarget.tableName}" đã thanh toán!`
          : `Đơn hàng ${newOrder.order_number} của ${checkoutTarget.tableName} đã thanh toán thành công!`
      );
    }

    handleClearCart();
    setIsMobileCartOpen(false);
    setCheckoutTarget(null);
    setPosViewMode('tables');
    await loadData();
    setTimeout(() => setSuccessBanner(null), 6000);
  };

  const totalCartCount = cart.reduce((acc, i) => acc + i.quantity, 0);
  const totalCartSubtotal = cart.reduce((acc, i) => acc + i.price * i.quantity, 0);
  const totalCartFinal = Math.max(0, totalCartSubtotal - discountAmount);
  const occupiedCount = activeTablesList.filter((t) => t.table.is_occupied).length;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-2 sm:p-4 flex flex-col gap-3">

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successBanner}</span>
          </div>
        </div>
      )}

      {/* TOP VIEW SWITCHER:
          - If ADMIN/OWNER in tables mode: Show [Sơ Đồ Bàn Đang Phục Vụ] & [Bàn Đã Thanh Toán] (/pos/orders)
          - When in MENU mode (Staff or Admin): Show [<- Quay lại danh sách bàn] & table name
      */}
      {!isStaff && posViewMode === 'tables' && (
        <PosAdminTabs
          activeTab="tables"
          occupiedCount={occupiedCount}
          unconfirmedCount={unconfirmedCount}
          completedCount={completedCount}
        />
      )}

      {/* Top bar when inside menu to go back to tables (for both Staff and Admin) */}
      {posViewMode === 'menu' && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <button
            type="button"
            onClick={() => {
              if (cart.length > 0) {
                if (!confirm('Bạn có chắc muốn quay lại danh sách bàn? Các món chưa lưu trong giỏ sẽ bị hủy.')) return;
                handleClearCart();
              }
              setPosViewMode('tables');
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-400 text-slate-700 dark:text-slate-200 font-bold text-xs sm:text-sm shadow-xs transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Quay lại danh sách bàn</span>
          </button>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 hidden sm:inline">Đang gọi món cho:</span>
            <span className="font-black px-3.5 py-1.5 rounded-xl bg-amber-500 text-white text-xs sm:text-sm shadow-xs">
              Bàn: {tableName || 'Bàn Mới'}
            </span>
            {existingOrderId && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Gọi thêm
              </span>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: ACTIVE TABLES GRID VIEW */}
      {posViewMode === 'tables' && (
        <TableGrid
          tables={activeTablesList}
          onSelectEmptyTable={handleSelectEmptyTable}
          onAddMoreItems={handleAddMoreItems}
          onCheckoutTable={handleCheckoutTableFromGrid}
          onPrintReceipt={(order) => setReceiptOrder(order)}
          onQuickNewTable={handleQuickNewTable}
        />
      )}

      {/* VIEW 2: MENU & POS CART VIEW */}
      {posViewMode === 'menu' && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Section (Menu & Products) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3">
            {/* Top Bar: Search & Custom Item FAB */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm nhanh tên món (VD: Cà phê, Trà sen, Bạc xỉu...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                />
              </div>

              {/* Quick Add Custom Item Button */}
              <button
                type="button"
                onClick={() => setIsCustomItemModalOpen(true)}
                className="px-3 sm:px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/20 flex items-center gap-1.5 shrink-0 transition-transform active:scale-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>Món Khác</span>
              </button>
            </div>

            {/* Category Chips Bar */}
            <CategoryChips
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
            />

            {/* Product Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3.5 pb-24 lg:pb-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={productQuantityMap[product.id] || 0}
                  onClick={handleProductClick}
                  onIncrement={handleIncrementProduct}
                  onDecrement={handleDecrementProduct}
                  onOpenCustomizer={handleOpenCustomizer}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">Không tìm thấy món phù hợp</p>
                <p className="text-xs mt-1">Thử từ khóa khác hoặc bấm "+ Món Custom" để tạo nhanh</p>
              </div>
            )}
          </div>

          {/* Right Section (Cart View) - Fixed column on Desktop */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-16 h-[calc(100vh-6rem)]">
            <CartView
              cart={cart}
              tables={tables}
              tableName={tableName}
              onChangeTableName={setTableName}
              orderType={orderType}
              discountAmount={discountAmount}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={handleClearCart}
              onSelectOrderType={setOrderType}
              onSetDiscount={setDiscountAmount}
              onOpenPayment={handleOpenPaymentFromCart}
              onSavePending={handleSavePending}
              isSavingPending={isSavingPending}
              existingOrderId={existingOrderId}
            />
          </div>
        </div>
      )}

      {/* Mobile Floating Bottom Cart Bar */}
      {posViewMode === 'menu' && cart.length > 0 && (
        <div className="lg:hidden fixed bottom-3 left-3 right-3 z-30">
          <button
            onClick={() => setIsMobileCartOpen(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-xl shadow-amber-600/40 flex items-center justify-between font-bold text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center text-xs">
                {totalCartCount}
              </div>
              <span>Xem giỏ hàng ({tableName})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">
                {formatCurrency(totalCartFinal)}
              </span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Drawer Modal */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full h-[90vh] bg-white dark:bg-slate-800 rounded-t-3xl overflow-hidden flex flex-col">
            <div className="p-2 border-b border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => setIsMobileCartOpen(false)}
                className="px-3 py-1 text-xs font-bold text-slate-500"
              >
                Đóng ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <CartView
                cart={cart}
                tables={tables}
                tableName={tableName}
                onChangeTableName={setTableName}
                orderType={orderType}
                discountAmount={discountAmount}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onClearCart={handleClearCart}
                onSelectOrderType={setOrderType}
                onSetDiscount={setDiscountAmount}
                onOpenPayment={handleOpenPaymentFromCart}
                onSavePending={handleSavePending}
                isSavingPending={isSavingPending}
                existingOrderId={existingOrderId}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <SizeSelectorModal
        product={customizingProduct}
        isOpen={Boolean(customizingProduct)}
        onClose={() => setCustomizingProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        onAddToCart={handleAddToCart}
        onRefreshMenu={loadData}
      />

      {checkoutTarget && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setCheckoutTarget(null);
          }}
          totalAmount={checkoutTarget.totalAmount}
          discountAmount={checkoutTarget.discountAmount}
          finalAmount={checkoutTarget.finalAmount}
          table={{ id: checkoutTarget.tableId, name: checkoutTarget.tableName, is_occupied: true }}
          orderType={checkoutTarget.orderType}
          orderNumber={checkoutTarget.orderNumber}
          order={checkoutTarget.order || null}
          onCompleteOrder={handleCompletePayment}
          onSplitAndPayOrder={handleSplitAndPayOrder}
          canDelete={!isStaff && Boolean(checkoutTarget.orderId || cart.length > 0)}
          onDeleteOrder={handleDeleteOrderFromPayment}
        />
      )}

      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          isOpen={Boolean(receiptOrder)}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}
