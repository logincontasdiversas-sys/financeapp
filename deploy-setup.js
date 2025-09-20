#!/usr/bin/env node

/**
 * Script para configurar deploy do FinanceApp
 * Execute: node deploy-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 FinanceApp - Setup de Deploy\n');

// Verificar se existe .env
const envPath = path.join(process.cwd(), '.env');
const envExamplePath = path.join(process.cwd(), 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('❌ Arquivo .env não encontrado!');
  console.log('📋 Copie o arquivo env.example para .env e configure suas variáveis:');
  console.log('   cp env.example .env');
  console.log('   # Edite o arquivo .env com suas credenciais do Supabase\n');
  process.exit(1);
}

// Verificar se o build funciona
console.log('🔨 Testando build...');
const { execSync } = require('child_process');

try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build funcionando!\n');
} catch (error) {
  console.log('❌ Erro no build! Corrija os erros antes de fazer deploy.\n');
  process.exit(1);
}

// Verificar arquivos necessários
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'vercel.json',
  'src/integrations/supabase/client.ts'
];

console.log('📁 Verificando arquivos necessários...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - ARQUIVO NECESSÁRIO!`);
  }
});

console.log('\n🎯 Próximos passos:');
console.log('1. Suba seu código para GitHub');
console.log('2. Acesse https://vercel.com');
console.log('3. Importe seu repositório');
console.log('4. Configure as variáveis de ambiente');
console.log('5. Faça o deploy!');
console.log('\n📖 Consulte o arquivo DEPLOY_GUIDE.md para instruções detalhadas');
