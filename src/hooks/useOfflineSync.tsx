import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { localStorageService, LocalData } from '@/services/localStorageService';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SyncStats {
  pending: number;
  synced: number;
  error: number;
}

export const useOfflineSync = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats>({ pending: 0, synced: 0, error: 0 });
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Monitorar status online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Atualizar estatísticas
  const updateStats = () => {
    if (user) {
      const stats = localStorageService.getStats(user.id);
      setSyncStats(stats);
    }
  };

  // Sincronizar uma operação específica
  const syncOperation = async (item: LocalData): Promise<boolean> => {
    if (!user) return false;

    try {
      let result;

      switch (item.operation) {
        case 'insert':
          result = await supabase
            .from(item.type as any)
            .insert({ ...item.data, user_id: user.id });
          break;

        case 'update':
          result = await supabase
            .from(item.type as any)
            .update(item.data)
            .eq('id', item.id)
            .eq('user_id', user.id);
          break;

        case 'delete':
          result = await supabase
            .from(item.type as any)
            .delete()
            .eq('id', item.id)
            .eq('user_id', user.id);
          break;

        default:
          throw new Error(`Operação desconhecida: ${item.operation}`);
      }

      if (result.error) {
        throw result.error;
      }

      // Marcar como sincronizado
      localStorageService.updateSyncStatus(item.id, item.type, 'synced');
      return true;

    } catch (error) {
      console.error('Erro na sincronização:', error);
      localStorageService.updateSyncStatus(item.id, item.type, 'error');
      
      // Falhar após 3 tentativas
      if ((item.retryCount || 0) >= 3) {
        toast({
          title: "Erro de Sincronização",
          description: `Falha ao sincronizar ${item.type} após 3 tentativas.`,
          variant: "destructive",
        });
      }
      
      return false;
    }
  };

  // Sincronizar fila pendente
  const syncPendingData = async () => {
    if (!isOnline || !user || isSyncing) return;

    setIsSyncing(true);
    const queue = localStorageService.getSyncQueue();
    const userQueue = queue.filter(item => 
      item.userId === user.id && 
      item.status === 'pending' &&
      (item.retryCount || 0) < 3
    );

    if (userQueue.length === 0) {
      setIsSyncing(false);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of userQueue) {
      const success = await syncOperation(item);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
    }

    if (successCount > 0) {
      toast({
        title: "Dados Sincronizados",
        description: `${successCount} item(s) sincronizado(s) com sucesso.`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: "Erro na Sincronização",
        description: `${errorCount} item(s) falharam na sincronização.`,
        variant: "destructive",
      });
    }

    updateStats();
    setIsSyncing(false);
  };

  // Salvar dados offline-first
  const saveOfflineFirst = useCallback(async (
    type: LocalData['type'],
    data: any,
    operation: LocalData['operation'] = 'insert',
    id?: string
  ) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    const itemId = id || crypto.randomUUID();
    
    // Salvar localmente primeiro (resposta imediata)
    localStorageService.saveData(type, itemId, data, operation, user.id);
    
    updateStats();

    // Tentar sincronizar imediatamente se online
    if (isOnline) {
      setTimeout(() => syncPendingData(), 100);
    }

    return itemId;
  }, [user, isOnline]);

  // Configurar sincronização automática
  useEffect(() => {
    if (user && isOnline) {
      // Sincronizar imediatamente
      syncPendingData();

      // Configurar intervalo de sincronização (a cada 30 segundos)
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }

      syncIntervalRef.current = setInterval(() => {
        syncPendingData();
      }, 30000);
    } else {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [user, isOnline]);

  // Atualizar estatísticas periodicamente
  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // Limpar dados ao fazer logout
  useEffect(() => {
    if (!user) {
      setSyncStats({ pending: 0, synced: 0, error: 0 });
    }
  }, [user]);

  // Limpeza automática de dados antigos
  useEffect(() => {
    const cleanup = () => {
      localStorageService.cleanSyncedData();
      updateStats();
    };

    // Limpar ao carregar
    cleanup();

    // Limpar a cada hora
    const interval = setInterval(cleanup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    isOnline,
    isSyncing,
    syncStats,
    saveOfflineFirst,
    syncPendingData,
    getLocalData: (type: LocalData['type']) => 
      localStorageService.getDataByType(type, user?.id),
    clearUserData: () => {
      if (user) {
        localStorageService.clearUserData(user.id);
        updateStats();
      }
    }
  };
};