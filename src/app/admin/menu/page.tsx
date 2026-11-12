'use client';

import React, { useState, useEffect } from 'react';
import { Product, Category, ProductSize } from '@/types/database';
import { DataService } from '@/lib/data-service';
import { formatCurrency } from '@/lib/utils';
import { AdminNav } from '@/components/admin/AdminNav';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Check,
  X,
  Search,
  Sparkles,
  Coffee,
  ToggleLeft,
  ToggleRight,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react';

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  // Category Edit/Add Modal
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catActionLoading, setCatActionLoading] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Product Edit/Add Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodName, setProdName] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState<number | ''>('');
  const [prodImageUrl, setProdImageUrl] = useState('');
  const [hasSizes, setHasSizes] = useState(false);
  const [basePriceStr, setBasePriceStr] = useState('25000');
  const [sizesList, setSizesList] = useState<{ size_name: string; price: number }[]>([
    { size_name: 'Size S (Vừa)', price: 25000 },
    { size_name: 'Size M (Lớn)', price: 30000 },
  ]);

  useEffect(() => {
    loadMenuData();

    const handleSync = () => loadMenuData();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') loadMenuData();
    };

    window.addEventListener('app:pull-to-refresh', handleSync);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('app:pull-to-refresh', handleSync);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const loadMenuData = async () => {
    const [cats, prods] = await Promise.all([
      DataService.getCategories(),
      DataService.getProducts(false), // Include both active and soft-deleted if any
    ]);
    setCategories(cats);
    setProducts(prods.filter((p) => p.is_active));
  };

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCatId === null || p.category_id === selectedCatId;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    return matchesCat && matchesSearch;
  });

  const handleToggleAvailable = async (productId: number) => {
    const newState = await DataService.toggleProductAvailability(productId);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_available: newState } : p))
    );
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdCategoryId(categories[0]?.id || '');
    setProdImageUrl('');
    setHasSizes(false);
    setBasePriceStr('25000');
    setSizesList([
      { size_name: 'Size S', price: 25000 },
      { size_name: 'Size M', price: 30000 },
    ]);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdCategoryId(prod.category_id || '');
    setProdImageUrl(prod.image_url || '');
    setHasSizes(prod.has_sizes);
    setBasePriceStr(prod.base_price.toString());
    setSizesList(
      prod.sizes && prod.sizes.length > 0
        ? prod.sizes.map((s) => ({ size_name: s.size_name, price: s.price }))
        : [
            { size_name: 'Size S', price: 25000 },
            { size_name: 'Size M', price: 30000 },
          ]
    );
    setIsProductModalOpen(true);
  };

  const handleAddSizeRow = () => {
    setSizesList((prev) => [...prev, { size_name: `Size ${String.fromCharCode(76 + prev.length)}`, price: 35000 }]);
  };

  const handleRemoveSizeRow = (idx: number) => {
    setSizesList((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateSizeRow = (idx: number, field: 'size_name' | 'price', val: any) => {
    setSizesList((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) {
      alert('Vui lòng nhập tên món');
      return;
    }

    const basePrice = Number(basePriceStr.replace(/[^0-9]/g, '')) || 0;
    await DataService.saveProduct(
      {
        id: editingProduct?.id,
        name: prodName.trim(),
        category_id: prodCategoryId ? Number(prodCategoryId) : null,
        image_url: prodImageUrl.trim() || null,
        has_sizes: hasSizes,
        base_price: basePrice,
        is_available: editingProduct?.is_available ?? true,
      },
      hasSizes ? sizesList : []
    );

    setIsProductModalOpen(false);
    loadMenuData();
  };

  const handleDeleteProduct = async (prodId: number) => {
    if (confirm('Xóa món này khỏi thực đơn (Soft Delete bảo toàn dữ liệu lịch sử)?')) {
      await DataService.softDeleteProduct(prodId);
      loadMenuData();
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setCatActionLoading(true);
    try {
      await DataService.saveCategory({
        id: editingCategory?.id,
        name: catName.trim(),
      });
      setCatName('');
      setEditingCategory(null);
      await loadMenuData();
    } catch (err: any) {
      alert('Lỗi lưu danh mục: ' + err.message);
    } finally {
      setCatActionLoading(false);
    }
  };

  const handleStartEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCatName('');
  };

  const handleDeleteCategory = async (cat: Category) => {
    const count = products.filter((p) => p.category_id === cat.id).length;
    const msg =
      count > 0
        ? `Danh mục "${cat.name}" hiện đang có ${count} món.\n\nNếu bạn xóa danh mục này, ${count} món đó sẽ được chuyển về nhóm "Chung (Chưa phân loại)".\n\nBạn có chắc chắn muốn xóa không?`
        : `Bạn có chắc chắn muốn xóa danh mục "${cat.name}" không?`;

    if (!confirm(msg)) return;

    setCatActionLoading(true);
    try {
      await DataService.deleteCategory(cat.id);
      if (editingCategory?.id === cat.id) {
        setEditingCategory(null);
        setCatName('');
      }
      if (selectedCatId === cat.id) {
        setSelectedCatId(null);
      }
      await loadMenuData();
    } catch (err: any) {
      alert('Lỗi khi xóa danh mục: ' + err.message);
    } finally {
      setCatActionLoading(false);
    }
  };

  const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    // Cập nhật giao diện tức thì
    setCategories(reordered);

    try {
      setIsReordering(true);
      const payload = reordered.map((cat, i) => ({
        id: cat.id,
        display_order: i + 1,
      }));
      await DataService.reorderCategories(payload);
    } catch (err: any) {
      console.error('Lỗi sắp xếp danh mục:', err);
      await loadMenuData();
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const reordered = [...categories];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setCategories(reordered);

    try {
      setIsReordering(true);
      const payload = reordered.map((cat, i) => ({
        id: cat.id,
        display_order: i + 1,
      }));
      await DataService.reorderCategories(payload);
    } catch (err: any) {
      console.error('Lỗi kéo thả danh mục:', err);
      await loadMenuData();
    } finally {
      setIsReordering(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-6">
      <AdminNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-amber-500" />
            <span>Quản Lý Thực Đơn & Kích Cỡ</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cấu hình danh mục, biến thể giá/size và bật tắt nhanh trạng thái hết hàng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setEditingCategory(null);
              setCatName('');
              setIsCatModalOpen(true);
            }}
            className="px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-amber-500" />
            <span>Quản Lý Danh Mục ({categories.length})</span>
          </button>

          <button
            onClick={handleOpenAddProduct}
            className="px-4 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-600/30 flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Món Mới</span>
          </button>
        </div>
      </div>

      {/* Filter and Category row */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <button
            onClick={() => setSelectedCatId(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              selectedCatId === null
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCatId === c.id
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => {
              setEditingCategory(null);
              setCatName('');
              setIsCatModalOpen(true);
            }}
            title="Thêm, sửa hoặc xóa danh mục"
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 border border-dashed border-amber-300 dark:border-amber-700/60 transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quản lý</span>
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm theo tên món..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Product List */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Mobile View: Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700/60 p-2 space-y-2">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="p-3 rounded-2xl bg-slate-50/70 dark:bg-slate-750/50 border border-slate-100 dark:border-slate-700 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {prod.image_url ? (
                      <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                    ) : (
                      <Coffee className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">
                      {prod.name}
                    </span>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                      {prod.category?.name || categories.find((c) => c.id === prod.category_id)?.name || 'Chung'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleAvailable(prod.id)}
                  className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all ${
                    prod.is_available
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      prod.is_available ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                  <span>{prod.is_available ? 'Bán' : 'Tạm hết'}</span>
                </button>
              </div>

              {/* Price / Sizes & Actions */}
              <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                <div className="flex-1 truncate mr-2">
                  {prod.has_sizes && prod.sizes && prod.sizes.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {prod.sizes.map((s) => (
                        <span
                          key={s.id}
                          className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[10px] font-bold text-amber-900 dark:text-amber-200"
                        >
                          {s.size_name}: {formatCurrency(s.price)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                      {formatCurrency(prod.base_price)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditProduct(prod)}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                    title="Sửa món"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                    title="Xóa món"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop / iPad View: Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-slate-100/90 dark:bg-slate-850 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Món & Hình ảnh</th>
                <th className="py-3 px-3">Danh mục</th>
                <th className="py-3 px-3">Giá bán / Kích thước (Sizes)</th>
                <th className="py-3 px-3 text-center">Bật / Tắt Bán (Quick Switch)</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredProducts.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                        {prod.image_url ? (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Coffee className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block">
                          {prod.name}
                        </span>
                        {prod.is_quick_created && (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                            ★ Tạo nhanh từ POS
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {prod.category?.name || categories.find((c) => c.id === prod.category_id)?.name || 'Chung'}
                    </span>
                  </td>

                  <td className="py-3 px-3">
                    {prod.has_sizes && prod.sizes && prod.sizes.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {prod.sizes.map((s) => (
                          <span
                            key={s.id}
                            className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-900 dark:text-amber-200"
                          >
                            {s.size_name}: {formatCurrency(s.price)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">
                        {formatCurrency(prod.base_price)}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailable(prod.id)}
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                        prod.is_available
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-300'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          prod.is_available ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{prod.is_available ? 'Còn hàng' : 'Tạm hết'}</span>
                    </button>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEditProduct(prod)}
                        title="Chỉnh sửa món"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(prod.id)}
                        title="Xóa món"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRODUCT FORM MODAL */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-xl bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white">
                {editingProduct ? 'Chỉnh Sửa Món' : 'Thêm Món Mới Vào Menu'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Tên món đồ uống / bánh *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Cà phê sữa tươi sương sáo"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs sm:text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Danh mục món
                  </label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Link ảnh đại diện (URL)
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={prodImageUrl}
                    onChange={(e) => setProdImageUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                  />
                </div>
              </div>

              {/* Toggle Has Sizes */}
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-950 dark:text-amber-200">
                    Món này có nhiều kích cỡ (Sizes)?
                  </p>
                  <p className="text-[11px] text-amber-700/80 dark:text-amber-400">
                    Bật để thêm các biến thể kích cỡ S, M, L với giá tiền khác nhau
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSizes}
                    onChange={(e) => setHasSizes(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>

              {!hasSizes ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                    Giá bán niêm yết (VNĐ) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={basePriceStr}
                    onChange={(e) => setBasePriceStr(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-base font-extrabold text-amber-600"
                  />
                </div>
              ) : (
                /* Dynamic Sizes List */
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Danh sách kích cỡ & Giá tiền tương ứng
                    </label>
                    <button
                      type="button"
                      onClick={handleAddSizeRow}
                      className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      + Thêm size mới
                    </button>
                  </div>

                  <div className="space-y-2">
                    {sizesList.map((row, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Tên size (VD: Size S)"
                          value={row.size_name}
                          onChange={(e) => handleUpdateSizeRow(idx, 'size_name', e.target.value)}
                          className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
                        />
                        <div className="relative w-36">
                          <input
                            type="number"
                            required
                            min={0}
                            step={1000}
                            placeholder="Giá"
                            value={row.price}
                            onChange={(e) => handleUpdateSizeRow(idx, 'price', Number(e.target.value))}
                            className="w-full p-2 pr-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black text-amber-600"
                          />
                          <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-bold">
                            đ
                          </span>
                        </div>
                        {sizesList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSizeRow(idx)}
                            className="p-1.5 text-slate-300 hover:text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30"
                >
                  Lưu Thông Tin Món
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Quản Lý Danh Mục Thực Đơn
                  </h3>
                  <p className="text-xs text-slate-400">
                    Thêm mới, đổi tên hoặc sắp xếp thứ tự hiển thị các nhóm món
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsCatModalOpen(false);
                  setEditingCategory(null);
                  setCatName('');
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Form for Add/Edit */}
            <form onSubmit={handleSaveCategory} className="space-y-2.5 bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <span>{editingCategory ? 'Đang sửa danh mục:' : 'Thêm danh mục mới:'}</span>
                  {editingCategory && (
                    <span className="text-amber-600 dark:text-amber-400 font-extrabold">
                      "{editingCategory.name}"
                    </span>
                  )}
                </label>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={handleCancelEditCategory}
                    className="text-[11px] text-slate-500 hover:text-rose-500 font-bold hover:underline"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nhập tên danh mục (VD: Cà phê pha máy, Trà trái cây...)"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  disabled={catActionLoading}
                  className="flex-1 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="submit"
                  disabled={catActionLoading || !catName.trim()}
                  className={`px-4 py-2.5 rounded-xl text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 ${
                    editingCategory
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-amber-600 hover:bg-amber-500'
                  }`}
                >
                  {catActionLoading ? (
                    <span>Đang lưu...</span>
                  ) : editingCategory ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Cập nhật</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Thêm</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Existing Categories List */}
            <div className="space-y-2 flex-1 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-2">
                  <span>Danh mục hiện có ({categories.length}):</span>
                  {isReordering && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                      Đang lưu thứ tự...
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  Dùng nút ▲▼ hoặc kéo thả để đổi thứ tự
                </span>
              </div>

              <div className="space-y-2 overflow-y-auto pr-1 flex-1 max-h-64">
                {categories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">
                    Chưa có danh mục nào. Hãy thêm danh mục đầu tiên ở trên.
                  </p>
                ) : (
                  categories.map((c, index) => {
                    const prodCount = products.filter((p) => p.category_id === c.id).length;
                    const isCurrentEditing = editingCategory?.id === c.id;
                    const isDragged = draggedIndex === index;

                    return (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                        className={`p-2.5 sm:p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                          isDragged
                            ? 'opacity-40 border-dashed border-amber-500 bg-amber-50/50 dark:bg-amber-950/20'
                            : isCurrentEditing
                            ? 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-500 ring-1 ring-amber-500'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {/* Left: Reorder controls (Arrows + Drag handle + Index badge) */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Drag handle icon */}
                          <div
                            className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 p-0.5 hidden sm:block"
                            title="Kéo thả để sắp xếp vị trí"
                          >
                            <GripVertical className="w-4 h-4" />
                          </div>

                          {/* Up & Down arrow buttons */}
                          <div className="flex flex-col gap-0.5">
                            <button
                              type="button"
                              disabled={index === 0 || isReordering}
                              onClick={() => handleMoveCategory(index, 'up')}
                              title="Chuyển lên trên"
                              className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={index === categories.length - 1 || isReordering}
                              onClick={() => handleMoveCategory(index, 'down')}
                              title="Chuyển xuống dưới"
                              className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Order position number badge */}
                          <span className="w-5 h-5 rounded-lg bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-black text-[10px] flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-600">
                            {index + 1}
                          </span>
                        </div>

                        {/* Middle: Name & Count */}
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                          <div className="truncate">
                            <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block truncate">
                              {c.name}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {prodCount > 0 ? `${prodCount} món đang thuộc nhóm này` : 'Chưa có món nào'}
                            </span>
                          </div>
                        </div>

                        {/* Right: Edit & Delete buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Sửa tên danh mục"
                            onClick={() => handleStartEditCategory(c)}
                            className="p-2 rounded-xl text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Xóa danh mục này"
                            onClick={() => handleDeleteCategory(c)}
                            className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsCatModalOpen(false);
                  setEditingCategory(null);
                  setCatName('');
                }}
                className="py-2.5 px-6 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

