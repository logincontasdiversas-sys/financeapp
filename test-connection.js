// Teste de conexão com Supabase
import { createClient } from '@supabase/supabase-js';

// Verificar variáveis de ambiente
console.log('=== TESTE DE CONEXÃO SUPABASE ===');
console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Configurado' : 'Não configurado');

// Testar conexão se as variáveis estiverem configuradas
if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );
  
  console.log('Cliente Supabase criado com sucesso!');
  
  // Testar conexão básica
  supabase.from('profiles').select('count').then(({ data, error }) => {
    if (error) {
      console.error('Erro na conexão:', error);
    } else {
      console.log('✅ Conexão com Supabase funcionando!');
      console.log('Dados recebidos:', data);
    }
  });
} else {
  console.log('❌ Variáveis de ambiente não configuradas');
  console.log('Para testar, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
}
