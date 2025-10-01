import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cibtvihaydjlsjjfytkt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYnR2aWhheWRqbHNqanZ5dGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxNzQ4MDAsImV4cCI6MjA0MTc1MDgwMH0.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('Executando migração para adicionar coluna current_amount...');
    
    // Execute the SQL migration using the SQL editor
    const { data, error } = await supabase
      .from('debts')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Erro ao conectar com Supabase:', error);
      return;
    }

    console.log('Conexão com Supabase estabelecida com sucesso!');
    console.log('A migração precisa ser executada manualmente no painel do Supabase.');
    console.log('SQL para executar:');
    console.log('ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;');
    console.log('COMMENT ON COLUMN debts.current_amount IS \'Current amount of the debt (optional)\';');
    
  } catch (err) {
    console.error('Erro:', err);
  }
}

executeMigration();
