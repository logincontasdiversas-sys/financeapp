import { supabase } from '@/integrations/supabase/client';

export const createTransferCategory = async (tenantId: string) => {
  try {
    // Verificar se a categoria já existe
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', 'Transferência entre Bancos')
      .single();

    if (existingCategory) {
      console.log('[TRANSFER_CATEGORY] Categoria já existe');
      return existingCategory.id;
    }

    // Criar a categoria de transferência
    const { data: newCategory, error } = await supabase
      .from('categories')
      .insert({
        name: 'Transferência entre Bancos',
        emoji: '🔄',
        tenant_id: tenantId,
        is_system: true, // Marcar como categoria do sistema
        archived: false
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[TRANSFER_CATEGORY] Categoria criada com sucesso:', newCategory.id);
    return newCategory.id;
  } catch (error) {
    console.error('[TRANSFER_CATEGORY] Erro ao criar categoria:', error);
    throw error;
  }
};
