const { execSync } = require('child_process');
const { writeFileSync, unlinkSync } = require('fs');

// Escreve o valor sem newline em arquivo temporário
writeFileSync('E:\\TRABALHO\\Sistema_Agendai\\agendai\\tmp-env-val.txt', 'agendai_webhook_verify_2026', { encoding: 'utf8' });

// Usa o arquivo como input para o vercel env add
try {
  const result = execSync(
    'vercel env add WHATSAPP_VERIFY_TOKEN production < E:\\TRABALHO\\Sistema_Agendai\\agendai\\tmp-env-val.txt',
    { cwd: 'E:\\TRABALHO\\Sistema_Agendai\\agendai', shell: 'cmd.exe', encoding: 'utf8' }
  );
  console.log(result);
} catch (e) {
  console.log(e.stdout);
  console.log(e.stderr);
}

unlinkSync('E:\\TRABALHO\\Sistema_Agendai\\agendai\\tmp-env-val.txt');
