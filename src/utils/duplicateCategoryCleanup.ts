import { supabase } from '../integrations/supabase/client';

/**
 * Limpa categorias duplicadas no banco de dados
 * Remove categorias com nomes similares que são duplicatas
 */
export async function cleanupDuplicateCategories(tenantId: string) {
  console.log('[DUPLICATE_CLEANUP] Iniciando limpeza de categorias duplicadas...');
  
  try {
    // 1. Buscar todas as categorias especiais
    const { data: specialCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name, created_at')
      .eq('tenant_id', tenantId)
      .or('name.like.Dívida -%,name.like.Meta -%,name.like.% - Dívida,name.like.% - Meta');

    if (categoriesError) {
      console.error('[DUPLICATE_CLEANUP] Erro ao buscar categorias especiais:', categoriesError);
      return { success: false, error: categoriesError };
    }

    if (!specialCategories || specialCategories.length === 0) {
      console.log('[DUPLICATE_CLEANUP] Nenhuma categoria especial encontrada');
      return { success: true, deleted: 0 };
    }

    console.log(`[DUPLICATE_CLEANUP] Encontradas ${specialCategories.length} categorias especiais`);

    let deletedCount = 0;
    const errors: string[] = [];

    // 2. Agrupar categorias por nome base (sem prefixos/sufixos)
    const categoryGroups = new Map<string, any[]>();

    specialCategories.forEach(category => {
      const baseName = category.name
        .replace(/^(Dívida -|Meta -)/, '') // Remove prefixos
        .replace(/( - Dívida| - Meta)$/, '') // Remove sufixos
        .trim()
        .toLowerCase();

      if (!categoryGroups.has(baseName)) {
        categoryGroups.set(baseName, []);
      }
      categoryGroups.get(baseName)!.push(category);
    });

    console.log(`[DUPLICATE_CLEANUP] Encontrados ${categoryGroups.size} grupos de categorias`);

    // 3. Para cada grupo, manter apenas a categoria mais recente
    for (const [baseName, categories] of categoryGroups) {
      if (categories.length <= 1) {
        console.log(`[DUPLICATE_CLEANUP] Grupo '${baseName}' tem apenas 1 categoria - mantendo`);
        continue;
      }

      console.log(`[DUPLICATE_CLEANUP] Grupo '${baseName}' tem ${categories.length} categorias duplicadas`);

      // Ordenar por data de criação (mais recente primeiro)
      categories.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Manter a primeira (mais recente) e deletar as outras
      const keepCategory = categories[0];
      const deleteCategories = categories.slice(1);

      console.log(`[DUPLICATE_CLEANUP] Mantendo: ${keepCategory.name} (${keepCategory.id})`);
      console.log(`[DUPLICATE_CLEANUP] Deletando ${deleteCategories.length} duplicatas`);

      for (const categoryToDelete of deleteCategories) {
        console.log(`[DUPLICATE_CLEANUP] Deletando: ${categoryToDelete.name} (${categoryToDelete.id})`);

        // Verificar se a categoria está sendo usada
        const { data: transactions, error: transactionsError } = await supabase
          .from('transactions')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('category_id', categoryToDelete.id)
          .limit(1);

        if (transactionsError) {
          console.error(`[DUPLICATE_CLEANUP] Erro ao verificar transações para ${categoryToDelete.name}:`, transactionsError);
          errors.push(`Erro ao verificar transações para ${categoryToDelete.name}`);
          continue;
        }

        if (transactions && transactions.length > 0) {
          console.log(`[DUPLICATE_CLEANUP] Categoria ${categoryToDelete.name} está sendo usada - mantendo`);
          continue;
        }

        // Deletar a categoria duplicada
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', categoryToDelete.id);

        if (deleteError) {
          console.error(`[DUPLICATE_CLEANUP] Erro ao deletar categoria ${categoryToDelete.name}:`, deleteError);
          errors.push(`Erro ao deletar categoria ${categoryToDelete.name}`);
        } else {
          console.log(`[DUPLICATE_CLEANUP] Categoria ${categoryToDelete.name} deletada com sucesso`);
          deletedCount++;
        }
      }
    }

    console.log(`[DUPLICATE_CLEANUP] Limpeza concluída: ${deletedCount} categorias duplicadas removidas`);
    
    return {
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('[DUPLICATE_CLEANUP] Erro geral na limpeza:', error);
    return { success: false, error };
  }
}
