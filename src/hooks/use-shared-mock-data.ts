"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { mockCategories, mockEquipements, mockPacks } from '@/lib/data';
import type { Category, EquipmentItem, Pack } from '@/lib/types';

function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) {
        window.localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
      }
      return JSON.parse(item);
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  const setStoredValue = useCallback(
    (newValue: T | ((val: T) => T)) => {
      try {
        const valueToStore = newValue instanceof Function ? newValue(value) : newValue;
        setValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
          window.dispatchEvent(new Event('local-storage'));
        }
      } catch (error) {
        console.warn(error);
      }
    },
    [key, value]
  );

  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          setValue(JSON.parse(item));
        }
      } catch (error) {
        console.warn(error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleStorageChange);
    };
  }, [key]);

  return [value, setStoredValue] as const;
}

export function useSharedMockData() {
    const [categories, setCategories] = useLocalStorage<Category[]>('tfc_categories', mockCategories);
    const [equipements, setEquipements] = useLocalStorage<EquipmentItem[]>('tfc_equipements', mockEquipements);
    const [packs, setPacks] = useLocalStorage<Pack[]>('tfc_packs', mockPacks);

    return {
        categories,
        setCategories,
        equipements,
        setEquipements,
        packs,
        setPacks,
    };
}
