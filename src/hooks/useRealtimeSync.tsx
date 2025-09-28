import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStableAuth } from './useStableAuth';
import { logger } from '@/utils/logger';
import { debounce } from 'lodash';

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
  const setupAttemptsRef = useRef(0);
  const maxSetupAttempts = 3;
  
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

  // Debounce no setup pra evitar loops
  const debouncedSetup = useCallback(
    debounce(() => {
      // Verificar se já está conectado para evitar loops
      if (isConnected) {
        logger.info('REALTIME_SYNC', 'Already connected, skipping setup', { table });
        return;
      }

      if (!user || isOffline) {
        logger.info('REALTIME_SYNC', 'Realtime sync disabled or already connected', { 
          user: !!user, 
          isOffline,
          isConnected 
        });
        return;
      }

      // Verificar tentativas de setup para evitar loops infinitos
      setupAttemptsRef.current++;
      if (setupAttemptsRef.current > maxSetupAttempts) {
        logger.error('REALTIME_SYNC', 'Max setup attempts reached - possible loop detected', { 
          table,
          attempts: setupAttemptsRef.current 
        });
        
        // Surpresa: Notificação de erro via console
        console.error('🚨 REALTIME LOOP DETECTED!', {
          table,
          attempts: setupAttemptsRef.current,
          user: user.id,
          isOffline
        });
        
        // Reset contador após um tempo
        setTimeout(() => {
          setupAttemptsRef.current = 0;
        }, 5000);
        
        return;
      }

      logger.info('REALTIME_SYNC', 'Setting up realtime sync', { 
        table,
        userId: user.id,
        attempt: setupAttemptsRef.current
      });

      // Criar canal com ID único
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
          
          // Reset contador em caso de sucesso
          if (status === 'SUBSCRIBED') {
            setupAttemptsRef.current = 0;
          }
        });

      channelRef.current = channel;

      // Cleanup
      return () => {
        if (channelRef.current) {
          logger.info('REALTIME_SYNC', 'Cleaning up realtime subscription', { table });
          supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          setIsConnected(false);
        }

        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
      };
    }, 300), // Debounce de 300ms no setup
    [user, isOffline, table, onInsert, onUpdate, onDelete, debouncedCallback, isConnected]
  );

  // useEffect com dependências corretas para evitar loops
  useEffect(() => {
    debouncedSetup();
    return debouncedSetup.cancel; // Cleanup debounce
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

// Hook para múltiplas tabelas (corrigido para evitar loops)
export const useMultiTableSync = (configs: RealtimeSyncOptions[]) => {
  const { user, isOffline } = useStableAuth();
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const configsRef = useRef(configs);

  // Atualizar ref quando configs mudam
  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  // Inicializar conexões
  useEffect(() => {
    const initialConnections: Record<string, boolean> = {};
    configs.forEach(config => {
      initialConnections[config.table] = false;
    });
    setConnections(initialConnections);
  }, [configs]);

  // Usar useMemo para evitar recriação desnecessária dos hooks
  const syncHooks = useMemo(() => {
    return configs.map(config => {
      const { onInsert, onUpdate, onDelete, ...restConfig } = config;
      
      return useRealtimeSync({
        ...restConfig,
        onInsert: onInsert ? (payload) => {
          onInsert(payload);
          setConnections(prev => ({ ...prev, [config.table]: true }));
        } : undefined,
        onUpdate: onUpdate ? (payload) => {
          onUpdate(payload);
          setConnections(prev => ({ ...prev, [config.table]: true }));
        } : undefined,
        onDelete: onDelete ? (payload) => {
          onDelete(payload);
          setConnections(prev => ({ ...prev, [config.table]: true }));
        } : undefined,
      });
    });
  }, [configs]);

  const allConnected = Object.values(connections).every(connected => connected);
  const anyConnected = Object.values(connections).some(connected => connected);

  logger.debug('REALTIME_SYNC', 'Multi-table sync status', {
    connections,
    allConnected,
    anyConnected,
    isOffline,
    tablesCount: configs.length
  });

  return {
    connections,
    allConnected,
    anyConnected,
    isOffline,
  };
};