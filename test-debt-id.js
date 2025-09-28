// Teste para verificar se o campo debt_id existe
import { supabase } from './src/integrations/supabase/client.js';

async function testDebtId() {
  try {
    // Tentar fazer uma query que usa debt_id
    const { data, error } = await supabase
      .from('transactions')
      .select('debt_id')
      .limit(1);
    
    if (error) {
      console.log('❌ Campo debt_id NÃO existe:', error.message);
      return false;
    } else {
      console.log('✅ Campo debt_id existe!');
      return true;
    }
  } catch (err) {
    console.log('❌ Erro ao testar debt_id:', err.message);
    return false;
  }
}

testDebtId();
