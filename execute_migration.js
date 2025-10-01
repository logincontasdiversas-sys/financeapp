const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cibtvihaydjlsjjfytkt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYnR2aWhheWRqbHNqanZ5dGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxNzQ4MDAsImV4cCI6MjA0MTc1MDgwMH0.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('Executando migração para adicionar coluna current_amount...');
    
    // Execute the SQL migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;
        COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';
      `
    });

    if (error) {
      console.error('Erro ao executar migração:', error);
      return;
    }

    console.log('Migração executada com sucesso!');
    console.log('Dados:', data);
  } catch (err) {
    console.error('Erro:', err);
  }
}

executeMigration();
