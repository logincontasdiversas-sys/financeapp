import { useTenant } from './useTenant';
import { cleanupUnusedPersonalCategories } from '@/utils/categoryCleanup';

/**
 * Hook para limpeza automática de categorias não utilizadas
 * Executa a limpeza APENAS quando:
 * - Uma dívida é deletada
 * - Uma meta é deletada
 */
export function useAutoCleanup() {
  const { tenantId } = useTenant();

  // Função para executar limpeza automática após exclusão
  const cleanupAfterDelete = async () => {
    if (!tenantId) return;

    try {
      console.log('[AUTO_CLEANUP] Executando limpeza automática após exclusão...');
      const result = await cleanupUnusedPersonalCategories(tenantId);
      
      if (result.success) {
        console.log(`[AUTO_CLEANUP] Limpeza automática concluída: ${result.deleted} categorias removidas`);
      } else {
        console.error('[AUTO_CLEANUP] Erro na limpeza automática:', result.error);
      }
      
      return result;
    } catch (error) {
      console.error('[AUTO_CLEANUP] Erro na limpeza automática:', error);
      return { success: false, error };
    }
  };

  return { cleanupAfterDelete };
}
