'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLocalDateString } from '@/lib/utils';

interface DateFilterContextType {
  selectedDate: string; // YYYY-MM-DD
  isToday: boolean;
  setSelectedDate: (date: string) => void;
  resetToToday: () => void;
  displayDate: string;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

function getTodayString(): string {
  return getLocalDateString();
}

export function DateFilterProvider({ children }: { children: React.ReactNode }) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [todayStr, setTodayStr] = useState<string>(getTodayString());
  const isToday = selectedDate === todayStr;

  useEffect(() => {
    const checkDate = () => {
      const currentToday = getTodayString();
      if (currentToday !== todayStr) {
        setTodayStr(currentToday);
        setSelectedDate((prev) => (prev === todayStr ? currentToday : prev));
      }
    };
    const interval = setInterval(checkDate, 30000);
    window.addEventListener('focus', checkDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDate);
    };
  }, [todayStr]);

  const resetToToday = () => {
    const currentToday = getTodayString();
    setTodayStr(currentToday);
    setSelectedDate(currentToday);
  };

  const formatDisplayDate = (dStr: string) => {
    if (dStr === todayStr) {
      const [y, m, d] = dStr.split('-');
      return `Hôm nay, ${d}/${m}`;
    }
    const [y, m, d] = dStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <DateFilterContext.Provider
      value={{
        selectedDate,
        isToday,
        setSelectedDate,
        resetToToday,
        displayDate: formatDisplayDate(selectedDate),
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
}

export function useDateFilter() {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
}

