'use client';

import React from 'react';
import { Category } from '@/types/database';

interface CategoryChipsProps {
  categories: Category[];
  selectedCategoryId: number | null; // null for All
  onSelectCategory: (id: number | null) => void;
}

export function CategoryChips({
  categories,
  selectedCategoryId,
  onSelectCategory,
}: CategoryChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 px-1">
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
          selectedCategoryId === null
            ? 'bg-amber-600 text-white shadow-amber-600/30'
            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
        }`}
      >
        Tất cả món
      </button>

      {categories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          onClick={() => onSelectCategory(cat.id)}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shadow-sm ${
            selectedCategoryId === cat.id
              ? 'bg-amber-600 text-white shadow-amber-600/30'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-amber-400'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

