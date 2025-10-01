import fetch from 'node-fetch';

// Supabase configuration
const supabaseUrl = 'https://cibtvihaydjlsjjfytkt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNpYnR2aWhheWRqbHNqanZ5dGt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjYxNzQ4MDAsImV4cCI6MjA0MTc1MDgwMH0.8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q8Q';

async function applyMigration() {
  try {
    console.log('Aplicando migração para adicionar coluna current_amount...');
    
    // SQL para executar
    const sql = `
      ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;
      COMMENT ON COLUMN debts.current_amount IS 'Current amount of the debt (optional)';
    `;

    // Executar SQL usando a API REST do Supabase
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        sql: sql
      })
    });

    if (response.ok) {
      console.log('✅ Migração aplicada com sucesso!');
      console.log('A coluna current_amount foi adicionada à tabela debts.');
    } else {
      const error = await response.text();
      console.error('❌ Erro ao aplicar migração:', error);
      console.log('\n📋 Instruções manuais:');
      console.log('1. Acesse: https://supabase.com/dashboard');
      console.log('2. Selecione o projeto: cibtvihaydjlsjjfytkt');
      console.log('3. Vá para SQL Editor');
      console.log('4. Execute o SQL:');
      console.log(sql);
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.log('\n📋 Instruções manuais:');
    console.log('1. Acesse: https://supabase.com/dashboard');
    console.log('2. Selecione o projeto: cibtvihaydjlsjjfytkt');
    console.log('3. Vá para SQL Editor');
    console.log('4. Execute o SQL:');
    console.log('ALTER TABLE debts ADD COLUMN current_amount DECIMAL(10,2) NULL;');
    console.log('COMMENT ON COLUMN debts.current_amount IS \'Current amount of the debt (optional)\';');
  }
}

applyMigration();
