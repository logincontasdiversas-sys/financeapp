import { supabase } from '../integrations/supabase/client';

/**
 * Limpa categorias personalizadas não utilizadas
 * Remove categorias que começam com "Dívida -" ou "Meta -" que não estão sendo usadas
 */
export async function cleanupUnusedPersonalCategories(tenantId: string) {
  console.log('[CATEGORY_CLEANUP] Iniciando limpeza de categorias não utilizadas...');
  
  try {
    // 1. Buscar todas as categorias personalizadas (Dívida - e Meta -)
    const { data: personalCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .or('name.like.Dívida -%,name.like.Meta -%');

    if (categoriesError) {
      console.error('[CATEGORY_CLEANUP] Erro ao buscar categorias personalizadas:', categoriesError);
      return { success: false, error: categoriesError };
    }

    if (!personalCategories || personalCategories.length === 0) {
      console.log('[CATEGORY_CLEANUP] Nenhuma categoria personalizada encontrada');
      return { success: true, deleted: 0 };
    }

    console.log(`[CATEGORY_CLEANUP] Encontradas ${personalCategories.length} categorias personalizadas`);

    let deletedCount = 0;
    const errors: string[] = [];

    // 2. Para cada categoria personalizada, verificar se está sendo usada
    for (const category of personalCategories) {
      console.log(`[CATEGORY_CLEANUP] Verificando categoria: ${category.name}`);

      // Verificar se está sendo usada em transações
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('category_id', category.id)
        .limit(1);

      if (transactionsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar transações para ${category.name}:`, transactionsError);
        errors.push(`Erro ao verificar transações para ${category.name}`);
        continue;
      }

      // Verificar se está sendo usada em dívidas (special_category_id)
      const { data: debts, error: debtsError } = await supabase
        .from('debts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('special_category_id', category.id)
        .limit(1);

      if (debtsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar dívidas para ${category.name}:`, debtsError);
        errors.push(`Erro ao verificar dívidas para ${category.name}`);
        continue;
      }

      // Verificar se está sendo usada em metas (special_category_id)
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('special_category_id', category.id)
        .limit(1);

      if (goalsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar metas para ${category.name}:`, goalsError);
        errors.push(`Erro ao verificar metas para ${category.name}`);
        continue;
      }

      // Se não está sendo usada em lugar nenhum, deletar
      if ((!transactions || transactions.length === 0) && 
          (!debts || debts.length === 0) && 
          (!goals || goals.length === 0)) {
        
        console.log(`[CATEGORY_CLEANUP] Categoria ${category.name} não está sendo usada - deletando...`);
        
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

        if (deleteError) {
          console.error(`[CATEGORY_CLEANUP] Erro ao deletar categoria ${category.name}:`, deleteError);
          errors.push(`Erro ao deletar categoria ${category.name}`);
        } else {
          console.log(`[CATEGORY_CLEANUP] Categoria ${category.name} deletada com sucesso`);
          deletedCount++;
        }
      } else {
        console.log(`[CATEGORY_CLEANUP] Categoria ${category.name} está sendo usada - mantendo`);
      }
    }

    console.log(`[CATEGORY_CLEANUP] Limpeza concluída: ${deletedCount} categorias deletadas`);
    
    return {
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('[CATEGORY_CLEANUP] Erro geral na limpeza:', error);
    return { success: false, error };
  }
}

/**
 * Limpa categorias personalizadas de dívidas não utilizadas
 */
export async function cleanupUnusedDebtCategories(tenantId: string) {
  console.log('[CATEGORY_CLEANUP] Iniciando limpeza de categorias de dívidas não utilizadas...');
  
  try {
    // 1. Buscar todas as categorias de dívidas
    const { data: debtCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .like('name', 'Dívida -%');

    if (categoriesError) {
      console.error('[CATEGORY_CLEANUP] Erro ao buscar categorias de dívidas:', categoriesError);
      return { success: false, error: categoriesError };
    }

    if (!debtCategories || debtCategories.length === 0) {
      console.log('[CATEGORY_CLEANUP] Nenhuma categoria de dívida encontrada');
      return { success: true, deleted: 0 };
    }

    let deletedCount = 0;
    const errors: string[] = [];

    // 2. Para cada categoria de dívida, verificar se está sendo usada
    for (const category of debtCategories) {
      console.log(`[CATEGORY_CLEANUP] Verificando categoria de dívida: ${category.name}`);

      // Verificar se está sendo usada em transações
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('category_id', category.id)
        .limit(1);

      if (transactionsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar transações para ${category.name}:`, transactionsError);
        errors.push(`Erro ao verificar transações para ${category.name}`);
        continue;
      }

      // Verificar se está sendo usada em dívidas (special_category_id)
      const { data: debts, error: debtsError } = await supabase
        .from('debts')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('special_category_id', category.id)
        .limit(1);

      if (debtsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar dívidas para ${category.name}:`, debtsError);
        errors.push(`Erro ao verificar dívidas para ${category.name}`);
        continue;
      }

      // Se não está sendo usada, deletar
      if ((!transactions || transactions.length === 0) && 
          (!debts || debts.length === 0)) {
        
        console.log(`[CATEGORY_CLEANUP] Categoria de dívida ${category.name} não está sendo usada - deletando...`);
        
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

        if (deleteError) {
          console.error(`[CATEGORY_CLEANUP] Erro ao deletar categoria ${category.name}:`, deleteError);
          errors.push(`Erro ao deletar categoria ${category.name}`);
        } else {
          console.log(`[CATEGORY_CLEANUP] Categoria de dívida ${category.name} deletada com sucesso`);
          deletedCount++;
        }
      } else {
        console.log(`[CATEGORY_CLEANUP] Categoria de dívida ${category.name} está sendo usada - mantendo`);
      }
    }

    console.log(`[CATEGORY_CLEANUP] Limpeza de dívidas concluída: ${deletedCount} categorias deletadas`);
    
    return {
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('[CATEGORY_CLEANUP] Erro geral na limpeza de dívidas:', error);
    return { success: false, error };
  }
}

/**
 * Limpa categorias personalizadas de metas não utilizadas
 */
export async function cleanupUnusedGoalCategories(tenantId: string) {
  console.log('[CATEGORY_CLEANUP] Iniciando limpeza de categorias de metas não utilizadas...');
  
  try {
    // 1. Buscar todas as categorias de metas
    const { data: goalCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .like('name', 'Meta -%');

    if (categoriesError) {
      console.error('[CATEGORY_CLEANUP] Erro ao buscar categorias de metas:', categoriesError);
      return { success: false, error: categoriesError };
    }

    if (!goalCategories || goalCategories.length === 0) {
      console.log('[CATEGORY_CLEANUP] Nenhuma categoria de meta encontrada');
      return { success: true, deleted: 0 };
    }

    let deletedCount = 0;
    const errors: string[] = [];

    // 2. Para cada categoria de meta, verificar se está sendo usada
    for (const category of goalCategories) {
      console.log(`[CATEGORY_CLEANUP] Verificando categoria de meta: ${category.name}`);

      // Verificar se está sendo usada em transações
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('category_id', category.id)
        .limit(1);

      if (transactionsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar transações para ${category.name}:`, transactionsError);
        errors.push(`Erro ao verificar transações para ${category.name}`);
        continue;
      }

      // Verificar se está sendo usada em metas (special_category_id)
      const { data: goals, error: goalsError } = await supabase
        .from('goals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('special_category_id', category.id)
        .limit(1);

      if (goalsError) {
        console.error(`[CATEGORY_CLEANUP] Erro ao verificar metas para ${category.name}:`, goalsError);
        errors.push(`Erro ao verificar metas para ${category.name}`);
        continue;
      }

      // Se não está sendo usada, deletar
      if ((!transactions || transactions.length === 0) && 
          (!goals || goals.length === 0)) {
        
        console.log(`[CATEGORY_CLEANUP] Categoria de meta ${category.name} não está sendo usada - deletando...`);
        
        const { error: deleteError } = await supabase
          .from('categories')
          .delete()
          .eq('id', category.id);

        if (deleteError) {
          console.error(`[CATEGORY_CLEANUP] Erro ao deletar categoria ${category.name}:`, deleteError);
          errors.push(`Erro ao deletar categoria ${category.name}`);
        } else {
          console.log(`[CATEGORY_CLEANUP] Categoria de meta ${category.name} deletada com sucesso`);
          deletedCount++;
        }
      } else {
        console.log(`[CATEGORY_CLEANUP] Categoria de meta ${category.name} está sendo usada - mantendo`);
      }
    }

    console.log(`[CATEGORY_CLEANUP] Limpeza de metas concluída: ${deletedCount} categorias deletadas`);
    
    return {
      success: true,
      deleted: deletedCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    console.error('[CATEGORY_CLEANUP] Erro geral na limpeza de metas:', error);
    return { success: false, error };
  }
}
