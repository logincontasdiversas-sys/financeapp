import { supabase } from '@/integrations/supabase/client';

interface Debt {
  id: string;
  title: string;
  paid_amount: number;
  total_amount: number;
  category_id: string;
}

interface Transaction {
  id: string;
  amount: number;
  status: string;
  category_id: string;
  debt_id?: string;
}

/**
 * Script para corrigir valores incorretos de dívidas
 * Recalcula paid_amount baseado apenas em despesas específicas de dívidas
 */
export async function correctDebtValues(tenantId: string): Promise<void> {
  console.log('[DEBT_CORRECTION] Iniciando correção de valores de dívidas...');

  try {
    // 1. Buscar todas as dívidas ativas
    const { data: debts, error: debtsError } = await supabase
      .from('debts')
      .select('id, title, paid_amount, total_amount, category_id')
      .eq('tenant_id', tenantId)
      .eq('settled', false);

    if (debtsError) {
      throw new Error(`Erro ao buscar dívidas: ${debtsError.message}`);
    }

    console.log(`[DEBT_CORRECTION] Encontradas ${debts?.length || 0} dívidas ativas`);

    if (!debts || debts.length === 0) {
      console.log('[DEBT_CORRECTION] Nenhuma dívida encontrada');
      return;
    }

    // 2. Para cada dívida, recalcular o paid_amount
    for (const debt of debts) {
      console.log(`[DEBT_CORRECTION] Processando dívida: ${debt.title}`);
      console.log(`[DEBT_CORRECTION] Valor atual pago: ${debt.paid_amount}`);
      console.log(`[DEBT_CORRECTION] Valor total: ${debt.total_amount}`);

      // 3. Buscar despesas específicas desta dívida (com debt_id)
      const { data: specificTransactions, error: specificError } = await supabase
        .from('transactions')
        .select('id, amount, status, category_id, debt_id')
        .eq('tenant_id', tenantId)
        .eq('kind', 'expense')
        .eq('debt_id', debt.id)
        .eq('status', 'settled'); // Apenas despesas pagas

      if (specificError) {
        console.error(`[DEBT_CORRECTION] Erro ao buscar transações específicas da dívida ${debt.title}:`, specificError);
        continue;
      }

      // 4. Calcular novo paid_amount baseado apenas em despesas específicas
      const newPaidAmount = specificTransactions?.reduce((sum, transaction) => {
        return sum + Number(transaction.amount || 0);
      }, 0) || 0;

      console.log(`[DEBT_CORRECTION] Transações específicas encontradas: ${specificTransactions?.length || 0}`);
      console.log(`[DEBT_CORRECTION] Novo valor pago calculado: ${newPaidAmount}`);

      // 5. Verificar se há diferença
      if (Math.abs(debt.paid_amount - newPaidAmount) > 0.01) {
        console.log(`[DEBT_CORRECTION] ⚠️  Dívida ${debt.title} tem valor incorreto!`);
        console.log(`[DEBT_CORRECTION] Valor atual: ${debt.paid_amount}`);
        console.log(`[DEBT_CORRECTION] Valor correto: ${newPaidAmount}`);
        console.log(`[DEBT_CORRECTION] Diferença: ${debt.paid_amount - newPaidAmount}`);

        // 6. Atualizar o valor correto
        const isFullyPaid = newPaidAmount >= debt.total_amount;
        
        const { error: updateError } = await supabase
          .from('debts')
          .update({
            paid_amount: newPaidAmount,
            is_concluded: isFullyPaid
          })
          .eq('id', debt.id);

        if (updateError) {
          console.error(`[DEBT_CORRECTION] Erro ao atualizar dívida ${debt.title}:`, updateError);
        } else {
          console.log(`[DEBT_CORRECTION] ✅ Dívida ${debt.title} corrigida com sucesso!`);
          console.log(`[DEBT_CORRECTION] Novo valor pago: ${newPaidAmount}`);
          console.log(`[DEBT_CORRECTION] Dívida totalmente paga: ${isFullyPaid ? 'Sim' : 'Não'}`);
        }
      } else {
        console.log(`[DEBT_CORRECTION] ✅ Dívida ${debt.title} já está com valor correto`);
      }
    }

    console.log('[DEBT_CORRECTION] ✅ Correção de valores concluída!');

  } catch (error) {
    console.error('[DEBT_CORRECTION] Erro durante a correção:', error);
    throw error;
  }
}

/**
 * Script para corrigir valores incorretos de metas
 * Recalcula current_amount baseado apenas em despesas específicas de metas
 */
export async function correctGoalValues(tenantId: string): Promise<void> {
  console.log('[GOAL_CORRECTION] Iniciando correção de valores de metas...');

  try {
    // 1. Buscar todas as metas ativas
    const { data: goals, error: goalsError } = await supabase
      .from('goals')
      .select('id, title, current_amount, target_amount, category_id')
      .eq('tenant_id', tenantId)
      .eq('is_concluded', false);

    if (goalsError) {
      throw new Error(`Erro ao buscar metas: ${goalsError.message}`);
    }

    console.log(`[GOAL_CORRECTION] Encontradas ${goals?.length || 0} metas ativas`);

    if (!goals || goals.length === 0) {
      console.log('[GOAL_CORRECTION] Nenhuma meta encontrada');
      return;
    }

    // 2. Para cada meta, recalcular o current_amount
    for (const goal of goals) {
      console.log(`[GOAL_CORRECTION] Processando meta: ${goal.title}`);
      console.log(`[GOAL_CORRECTION] Valor atual: ${goal.current_amount}`);
      console.log(`[GOAL_CORRECTION] Valor alvo: ${goal.target_amount}`);

      // 3. Buscar despesas específicas desta meta (com goal_id)
      const { data: specificTransactions, error: specificError } = await supabase
        .from('transactions')
        .select('id, amount, status, category_id, goal_id')
        .eq('tenant_id', tenantId)
        .eq('kind', 'expense')
        .eq('goal_id', goal.id)
        .eq('status', 'settled'); // Apenas despesas pagas

      if (specificError) {
        console.error(`[GOAL_CORRECTION] Erro ao buscar transações específicas da meta ${goal.title}:`, specificError);
        continue;
      }

      // 4. Calcular novo current_amount baseado apenas em despesas específicas
      const newCurrentAmount = specificTransactions?.reduce((sum, transaction) => {
        return sum + Number(transaction.amount || 0);
      }, 0) || 0;

      console.log(`[GOAL_CORRECTION] Transações específicas encontradas: ${specificTransactions?.length || 0}`);
      console.log(`[GOAL_CORRECTION] Novo valor atual calculado: ${newCurrentAmount}`);

      // 5. Verificar se há diferença
      if (Math.abs(goal.current_amount - newCurrentAmount) > 0.01) {
        console.log(`[GOAL_CORRECTION] ⚠️  Meta ${goal.title} tem valor incorreto!`);
        console.log(`[GOAL_CORRECTION] Valor atual: ${goal.current_amount}`);
        console.log(`[GOAL_CORRECTION] Valor correto: ${newCurrentAmount}`);
        console.log(`[GOAL_CORRECTION] Diferença: ${goal.current_amount - newCurrentAmount}`);

        // 6. Atualizar o valor correto
        const isGoalAchieved = newCurrentAmount >= goal.target_amount;
        
        const { error: updateError } = await supabase
          .from('goals')
          .update({
            current_amount: newCurrentAmount,
            is_concluded: isGoalAchieved
          })
          .eq('id', goal.id);

        if (updateError) {
          console.error(`[GOAL_CORRECTION] Erro ao atualizar meta ${goal.title}:`, updateError);
        } else {
          console.log(`[GOAL_CORRECTION] ✅ Meta ${goal.title} corrigida com sucesso!`);
          console.log(`[GOAL_CORRECTION] Novo valor atual: ${newCurrentAmount}`);
          console.log(`[GOAL_CORRECTION] Meta atingida: ${isGoalAchieved ? 'Sim' : 'Não'}`);
        }
      } else {
        console.log(`[GOAL_CORRECTION] ✅ Meta ${goal.title} já está com valor correto`);
      }
    }

    console.log('[GOAL_CORRECTION] ✅ Correção de valores concluída!');

  } catch (error) {
    console.error('[GOAL_CORRECTION] Erro durante a correção:', error);
    throw error;
  }
}

/**
 * Função principal para executar todas as correções
 */
export async function runAllCorrections(tenantId: string): Promise<void> {
  console.log('[CORRECTION] Iniciando correção completa de valores...');
  
  try {
    await correctDebtValues(tenantId);
    await correctGoalValues(tenantId);
    
    console.log('[CORRECTION] ✅ Todas as correções foram concluídas com sucesso!');
  } catch (error) {
    console.error('[CORRECTION] Erro durante as correções:', error);
    throw error;
  }
}
