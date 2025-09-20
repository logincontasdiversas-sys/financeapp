import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from './useStableAuth';
import { logger } from '@/utils/logger';

interface RealtimeSyncOptions {
  table: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  debounceMs?: number;
}

export const useRealtimeSync = ({
  table,
  onInsert,
  onUpdate,
  onDelete,
  debounceMs = 1000, // Debounce de 1 segundo por padrão
}: RealtimeSyncOptions) => {
  const { user, isOffline } = useStableAuth();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<any>(null);
  // Gerar um identificador único por instância para evitar colisão de nomes de canal
  const channelIdRef = useRef<string>(`rt_${table}_${Math.random().toString(36).slice(2, 10)}`);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Função debounced para callbacks
  const debouncedCallback = useCallback(
    (callback: ((payload: any) => void) | undefined, payload: any) => {
      if (!callback) return;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        callback(payload);
        debounceTimerRef.current = null;
      }, debounceMs);
    },
    [debounceMs]
  );

  // Configurar realtime subscription
  useEffect(() => {
    if (!user || isOffline) {
      logger.info('REALTIME_SYNC', 'Realtime sync disabled', { 
        user: !!user, 
        isOffline 
      });
      return;
    }

    logger.info('REALTIME_SYNC', 'Setting up realtime sync', { 
      table,
      userId: user.id 
    });

    // Criar canal com ID único para evitar interferência entre componentes
    const channel = supabase
      .channel(channelIdRef.current)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
        },
        (payload) => {
          logger.debug('REALTIME_SYNC', 'INSERT event received', { 
            table,
            recordId: payload.new?.id 
          });
          if (onInsert) debouncedCallback(onInsert, payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table,
        },
        (payload) => {
          logger.debug('REALTIME_SYNC', 'UPDATE event received', { 
            table,
            recordId: payload.new?.id 
          });
          if (onUpdate) debouncedCallback(onUpdate, payload);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table,
        },
        (payload) => {
          logger.debug('REALTIME_SYNC', 'DELETE event received', { 
            table,
            recordId: payload.old?.id 
          });
          if (onDelete) debouncedCallback(onDelete, payload);
        }
      )
      .subscribe((status) => {
        logger.info('REALTIME_SYNC', 'Subscription status changed', { 
          table,
          status 
        });
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (channelRef.current) {
        logger.info('REALTIME_SYNC', 'Cleaning up realtime subscription', { table });
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [user, isOffline, table, debouncedCallback]);

  // Monitorar mudanças de conectividade
  useEffect(() => {
    if (isOffline && channelRef.current) {
      logger.warn('REALTIME_SYNC', 'Going offline - pausing realtime sync', { table });
      setIsConnected(false);
    }
  }, [isOffline, table]);

  return {
    isConnected,
    isOffline,
  };
};

// Hook para múltiplas tabelas
export const useMultiTableSync = (configs: RealtimeSyncOptions[]) => {
  const { user, isOffline } = useStableAuth();
  const [connections, setConnections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initialConnections: Record<string, boolean> = {};
    configs.forEach(config => {
      initialConnections[config.table] = false;
    });
    setConnections(initialConnections);
  }, [configs]);

  // Configurar cada tabela
  configs.forEach(config => {
    useRealtimeSync({
      ...config,
      onInsert: config.onInsert ? (payload) => {
        config.onInsert!(payload);
        setConnections(prev => ({ ...prev, [config.table]: true }));
      } : undefined,
      onUpdate: config.onUpdate ? (payload) => {
        config.onUpdate!(payload);
        setConnections(prev => ({ ...prev, [config.table]: true }));
      } : undefined,
      onDelete: config.onDelete ? (payload) => {
        config.onDelete!(payload);
        setConnections(prev => ({ ...prev, [config.table]: true }));
      } : undefined,
    });
  });

  const allConnected = Object.values(connections).every(connected => connected);
  const anyConnected = Object.values(connections).some(connected => connected);

  logger.debug('REALTIME_SYNC', 'Multi-table sync status', {
    connections,
    allConnected,
    anyConnected,
    isOffline
  });

  return {
    connections,
    allConnected,
    anyConnected,
    isOffline,
  };
};