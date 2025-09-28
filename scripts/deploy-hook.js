#!/usr/bin/env node

const https = require('https');

const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL || 'https://api.vercel.com/v1/integrations/deploy/prj_kSlu24GWZ1U3kUFd0hUWnJo3KipL/jw4zUasX8K';

if (!hookUrl) {
  console.error('❌ VERCEL_DEPLOY_HOOK_URL não definida.');
  process.exit(1);
}

console.log('🚀 Disparando Deploy Hook da Vercel...');

const req = https.request(hookUrl, { method: 'POST' }, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('✅ Deploy Hook disparado. Status:', res.statusCode);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        console.log('Retorno:', parsed);
      } catch {
        console.log('Retorno bruto:', data);
      }
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Erro ao disparar Deploy Hook:', err.message);
  process.exit(1);
});

req.end();


