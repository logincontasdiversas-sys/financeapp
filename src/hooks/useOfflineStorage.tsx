import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';
import { useOfflineSync } from './useOfflineSync';

interface OfflineStorageOptions {
  syncOnline?: boolean;
  maxRetries?: number;
}

export function useOfflineStorage<T>(
  storageKey: string,
  options: OfflineStorageOptions = {}
) {
  const { user } = useAuth();
  const { saveOfflineFirst, isOnline } = useOfflineSync();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { syncOnline = true, maxRetries = 3 } = options;

  // Carregar dados do localStorage
  const loadFromStorage = useCallback(() => {
    if (!user) return;

    try {
      const key = `${storageKey}_${user.id}`;
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setData(parsed);
        logger.debug('OFFLINE_STORAGE', `Loaded data from storage: ${storageKey}`, {
          count: parsed.length
        });
      }
    } catch (error) {
      logger.error('OFFLINE_STORAGE', `Failed to load from storage: ${storageKey}`, error);
    }
  }, [user, storageKey]);

  // Salvar no localStorage
  const saveToStorage = useCallback((newData: T[]) => {
    if (!user) return;

    try {
      const key = `${storageKey}_${user.id}`;
      localStorage.setItem(key, JSON.stringify(newData));
      logger.debug('OFFLINE_STORAGE', `Saved data to storage: ${storageKey}`, {
        count: newData.length
      });
    } catch (error) {
      logger.error('OFFLINE_STORAGE', `Failed to save to storage: ${storageKey}`, error);
    }
  }, [user, storageKey]);

  // Adicionar item (offline-first)
  const addItem = useCallback(async (item: Omit<T, 'id'>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);
    
    try {
      const newItem = {
        ...item,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: user.id
      } as T;

      // Adicionar localmente primeiro
      const newData = [...data, newItem];
      setData(newData);
      saveToStorage(newData);

      // Tentar sincronizar se online e habilitado
      if (isOnline && syncOnline) {
        await saveOfflineFirst(storageKey as any, newItem, 'insert');
      }

      logger.info('OFFLINE_STORAGE', `Item added to ${storageKey}`, { 
        itemId: (newItem as any).id 
      });

      return newItem;

    } catch (error) {
      logger.error('OFFLINE_STORAGE', `Failed to add item to ${storageKey}`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, data, storageKey, isOnline, syncOnline, saveOfflineFirst, saveToStorage]);

  // Atualizar item
  const updateItem = useCallback(async (id: string, updates: Partial<T>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);

    try {
      const newData = data.map(item => 
        (item as any).id === id 
          ? { ...item, ...updates, updated_at: new Date().toISOString() }
          : item
      );

      setData(newData);
      saveToStorage(newData);

      // Tentar sincronizar se online
      if (isOnline && syncOnline) {
        await saveOfflineFirst(storageKey as any, updates, 'update', id);
      }

      logger.info('OFFLINE_STORAGE', `Item updated in ${storageKey}`, { itemId: id });

    } catch (error) {
      logger.error('OFFLINE_STORAGE', `Failed to update item in ${storageKey}`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, data, storageKey, isOnline, syncOnline, saveOfflineFirst, saveToStorage]);

  // Deletar item
  const deleteItem = useCallback(async (id: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setIsLoading(true);

    try {
      const newData = data.filter(item => (item as any).id !== id);
      setData(newData);
      saveToStorage(newData);

      // Tentar sincronizar se online
      if (isOnline && syncOnline) {
        await saveOfflineFirst(storageKey as any, {}, 'delete', id);
      }

      logger.info('OFFLINE_STORAGE', `Item deleted from ${storageKey}`, { itemId: id });

    } catch (error) {
      logger.error('OFFLINE_STORAGE', `Failed to delete item from ${storageKey}`, error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, data, storageKey, isOnline, syncOnline, saveOfflineFirst, saveToStorage]);

  // Carregar dados ao inicializar
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return {
    data,
    isLoading,
    addItem,
    updateItem,
    deleteItem,
    refreshFromStorage: loadFromStorage
  };
}