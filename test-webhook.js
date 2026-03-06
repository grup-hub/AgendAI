const https = require('https');

const url = 'https://sistema-agendai.vercel.app/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=agendai_webhook_verify_2026&hub.challenge=TESTE123';

https.get(url, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', e => console.log('Error:', e.message));
