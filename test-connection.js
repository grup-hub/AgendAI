import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Testando conexão com Supabase...\n');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey?.substring(0, 20) + '...');
console.log('Service Key:', supabaseServiceKey?.substring(0, 20) + '...\n');

// Teste 1: Cliente Anônimo
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
console.log('✅ Cliente anônimo criado');

// Teste 2: Cliente Admin
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
console.log('✅ Cliente admin criado\n');

// Teste 3: Verificar tabelas
async function testConnection() {
  try {
    console.log('🔄 Testando query nas tabelas...');

    const { data: usuarios, error } = await supabaseAdmin
      .from('USUARIO')
      .select('*')
      .limit(5);

    if (error) {
      console.error('❌ Erro ao buscar usuários:', error.message);
      return;
    }

    console.log(`✅ Tabela USUARIO OK (${usuarios?.length || 0} registros)`);

    const { data: agendas, error: agendaError } = await supabaseAdmin
      .from('AGENDA')
      .select('*')
      .limit(5);

    if (agendaError) {
      console.error('❌ Erro ao buscar agendas:', agendaError.message);
      return;
    }

    console.log(`✅ Tabela AGENDA OK (${agendas?.length || 0} registros)`);

    const { data: compromissos, error: compromissoError } = await supabaseAdmin
      .from('COMPROMISSO')
      .select('*')
      .limit(5);

    if (compromissoError) {
      console.error('❌ Erro ao buscar compromissos:', compromissoError.message);
      return;
    }

    console.log(`✅ Tabela COMPROMISSO OK (${compromissos?.length || 0} registros)`);

    console.log('\n🎉 TUDO OK! Supabase conectado com sucesso!\n');

    // Exibir dados de teste
    if (usuarios && usuarios.length > 0) {
      console.log('📊 Exemplo de usuário:');
      console.log(usuarios[0]);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro geral:', error);
    process.exit(1);
  }
}

testConnection();
