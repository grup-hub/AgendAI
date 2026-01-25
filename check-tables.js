import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

console.log('🔍 Verificando tabelas no banco...\n');

async function checkTables() {
  try {
    // Listar todas as tabelas do schema public
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log(`✅ Encontradas ${tables.length} tabelas:\n`);
    tables.forEach((t) => {
      console.log(`  - ${t.table_name}`);
    });

    // Testar uma query simples
    console.log('\n🔄 Testando query na tabela usuario...');
    const usuarios = await sql`SELECT * FROM usuario LIMIT 1;`;
    console.log(`✅ Query OK! (${usuarios.length} registros)\n`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    await sql.end();
    process.exit(1);
  }
}

checkTables();
