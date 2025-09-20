import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import { useAuth } from './useAuth';

interface QueryOptions {
  enabled?: boolean;
  refetchInterval?: number;
  cacheKey?: string;
}

interface QueryResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Cache simples para evitar queries repetitivas
const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function useSupabaseQuery<T = any>(
  queryFn: () => Promise<{ data: T[] | null; error: any }>,
  options: QueryOptions = {},
  deps: any[] = []
): QueryResult<T[]> {
  const { user } = useAuth();
  const [data, setData] = useState<T[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true, refetchInterval, cacheKey } = options;

  const executeQuery = useCallback(async () => {
    if (!enabled || !user) {
      setIsLoading(false);
      return;
    }

    const key = cacheKey || `query_${user.id}`;
    
    // Verificar cache
    const cached = queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      setData(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.debug('SUPABASE_QUERY', 'Executing custom query', { userId: user.id });

      const result = await queryFn();

      if (result.error) {
        throw new Error(result.error.message);
      }

      setData(result.data || []);
      
      // Cache por 5 minutos
      queryCache.set(key, {
        data: result.data || [],
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000
      });

      logger.info('SUPABASE_QUERY', 'Query successful', { 
        count: result.data?.length || 0
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Query failed');
      setError(error);
      logger.error('SUPABASE_QUERY', 'Query failed', { 
        error: error.message,
        userId: user.id 
      });
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, user, enabled, cacheKey, ...deps]);

  // Effect para executar query
  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  // Effect para refetch automático
  useEffect(() => {
    if (refetchInterval && enabled) {
      const interval = setInterval(executeQuery, refetchInterval);
      return () => clearInterval(interval);
    }
  }, [executeQuery, refetchInterval, enabled]);

  return {
    data,
    isLoading,
    error,
    refetch: executeQuery
  };
}

// Hook específico para queries customizadas
export function useCustomQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  dependencies: any[] = [],
  options: QueryOptions = {}
): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { enabled = true } = options;

  const executeQuery = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      
      if (result.error) {
        throw new Error(result.error.message);
      }

      setData(result.data);
      logger.info('CUSTOM_QUERY', 'Custom query successful');

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Custom query failed');
      setError(error);
      logger.error('CUSTOM_QUERY', 'Custom query failed', { error: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled, ...dependencies]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  return {
    data,
    isLoading,
    error,
    refetch: executeQuery
  };
}

// Limpar cache quando necessário
export const clearQueryCache = (pattern?: string) => {
  if (pattern) {
    for (const key of queryCache.keys()) {
      if (key.includes(pattern)) {
        queryCache.delete(key);
      }
    }
  } else {
    queryCache.clear();
  }
};