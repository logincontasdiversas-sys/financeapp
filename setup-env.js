#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Configuração do FinanceApp - Supabase\n');

const questions = [
  {
    key: 'VITE_SUPABASE_URL',
    question: 'Digite a URL do seu projeto Supabase (ex: https://abc123.supabase.co): ',
    validate: (value) => value.startsWith('https://') && value.includes('.supabase.co')
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    question: 'Digite a chave anônima do Supabase (anon key): ',
    validate: (value) => value.length > 50
  }
];

const envContent = [];

function askQuestion(index) {
  if (index >= questions.length) {
    createEnvFile();
    return;
  }

  const question = questions[index];
  
  rl.question(question.question, (answer) => {
    if (question.validate(answer.trim())) {
      envContent.push(`${question.key}=${answer.trim()}`);
      askQuestion(index + 1);
    } else {
      console.log('❌ Valor inválido. Tente novamente.\n');
      askQuestion(index);
    }
  });
}

function createEnvFile() {
  const envPath = path.join(__dirname, '.env');
  
  const fullContent = [
    '# Supabase Configuration',
    '# Gerado automaticamente pelo setup-env.js',
    '',
    ...envContent,
    '',
    '# Optional: Push Notifications (VAPID)',
    '# VITE_VAPID_PUBLIC_KEY=your_vapid_public_key',
    '',
    '# Optional: Development flags',
    '# VITE_SHOW_PRD=true'
  ].join('\n');

  try {
    fs.writeFileSync(envPath, fullContent);
    console.log('\n✅ Arquivo .env criado com sucesso!');
    console.log('📁 Localização:', envPath);
    console.log('\n🔄 Reinicie o servidor de desenvolvimento:');
    console.log('   npm run dev');
    console.log('\n🎯 Acesse: https://supabase.com/dashboard para obter as credenciais');
  } catch (error) {
    console.error('❌ Erro ao criar arquivo .env:', error.message);
  }
  
  rl.close();
}

// Verificar se já existe .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  rl.question('⚠️  Arquivo .env já existe. Deseja sobrescrever? (y/N): ', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      askQuestion(0);
    } else {
      console.log('❌ Operação cancelada.');
      rl.close();
    }
  });
} else {
  askQuestion(0);
}
